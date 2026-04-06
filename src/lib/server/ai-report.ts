import { env } from '$env/dynamic/private';
import { GoogleGenAI, Type } from '@google/genai';
import { searchMultiple, VALID_QUERY_TERMS } from './google-places';
import type { PlaceCategory } from '$lib/types';

const SYSTEM_PROMPT = `You are a fair, evidence-based business location analyst. Your job is to give a balanced assessment — neither cheerleading nor catastrophizing. Acknowledge genuine strengths where the data supports them, then stress-test assumptions honestly.

1. First, use the search_nearby_places tool to find relevant nearby places. Choose up to 5 search queries most relevant to this business. Prioritize:
   - Direct competitors and saturation signals
   - Demand proxies: who would actually walk through the door and why
   - Complementary businesses that could drive referral traffic
   - Structural risks: transit access, parking, incompatible neighbors

2. After receiving results, write a business opportunity report in Markdown with these exact sections:

## Executive Summary
Open with a balanced 2–3 sentence summary: what the data genuinely supports, and what it genuinely challenges. Do not lead with doom or with hype — lead with the most important fact.

## Customer Segments
Identify 3-5 realistic customer segments from nearby evidence. For each: who they actually are, realistic appeal for this business, realistic friction or barriers, and when they're around. For each segment: note realistic opportunity AND realistic friction. Be skeptical of segments that require assumptions, but credit segments where foot traffic evidence is strong.

## Market Saturation
Name specific competitors found nearby. If saturation is high, say so directly. Rate Low/Medium/High and justify. If Low, consider both interpretations: possible unmet demand, or possible lack of market fit — weigh the evidence rather than defaulting to the negative.

## Major Failure Modes
List 3-5 specific, location-grounded risks and structural challenges. Reference actual nearby places and patterns. Focus on what could go wrong if assumptions don't hold — not on what will definitely fail. Do not list generic startup risks — make it specific to this location.

## Strategies to Combat Failures
For each failure mode, one concrete countermeasure. Be honest when a failure mode has no good answer.

## Location Score
Rate 1-10. Most locations score 4-7. Reserve 8+ for genuinely strong signals. Reserve 1-3 for locations with structural problems. Give a single blunt sentence justifying the score.

Rules:
- Every major claim — positive or negative — must be grounded in specific data from the search results. Don't manufacture positivity, but don't manufacture pessimism either.
- If the data shows a red flag, state it plainly — do not bury it
- If the data shows a genuine advantage, state it plainly — do not dismiss it
- Reference actual place names from the search results
- Answer in the same language as the user prompt`;

const searchToolDeclaration = {
	name: 'search_nearby_places',
	description:
		'Search for nearby places to analyze this business opportunity. Choose up to 5 terms most relevant to competition, demand, and structural risks. Each returns up to 6 results.',
	parameters: {
		type: Type.OBJECT,
		properties: {
			queries: {
				type: Type.ARRAY,
				items: { type: Type.STRING, enum: VALID_QUERY_TERMS },
				description: 'Array of up to 5 category terms from the allowed enum.'
			}
		},
		required: ['queries']
	}
};

interface GenerateReportResult {
	report: string;
	queries_used: string[];
	places: PlaceCategory[];
}

export async function generateReport(
	lat: number,
	lng: number,
	radius_m: number,
	business_description: string,
	address: string
): Promise<GenerateReportResult> {
	const apiKey = env.GEMINI_API_KEY;
	if (!apiKey) throw new Error('GEMINI_API_KEY not configured');
	const ai = new GoogleGenAI({ apiKey });

	const userMessage = `Ide bisnis: ${business_description}

Lokasi: ${address} (${lat.toFixed(6)}, ${lng.toFixed(6)})
Radius Pencarian: ${radius_m}m

Cari relevant nearby places kemudian buatkan sebuah business opportunity report.
Things to note:
	- gunakan "menara" atau "tower" untuk pencarian gedung kantor
	- gunakan "apartemen" atau "perumahan" untuk pencarian area residensial
`;

	// Step 1: Initial call with tool
	const response = await ai.models.generateContent({
		model: 'gemini-3.1-flash-lite-preview', // gemini 3.1 model should be used
		contents: [{ role: 'user', parts: [{ text: userMessage }] }],
		config: {
			systemInstruction: SYSTEM_PROMPT,
			temperature: 0.3,
			maxOutputTokens: 2500,
			tools: [{ functionDeclarations: [searchToolDeclaration] }]
		}
	});

	const candidate = response.candidates?.[0];
	if (!candidate?.content?.parts) {
		throw new Error('No response from AI');
	}

	// Check if AI wants to call the tool
	const functionCall = candidate.content.parts.find((p) => p.functionCall);

	if (!functionCall?.functionCall) {
		// AI responded directly without tool use — return whatever text it gave
		const text = candidate.content.parts.find((p) => p.text)?.text ?? '';
		return { report: text, queries_used: [], places: [] };
	}

	// Step 2: Execute the tool call
	const args = functionCall.functionCall.args as { queries: string[] };
	const queries = (args.queries || []).slice(0, 5);

	const searchResults = await searchMultiple(lat, lng, radius_m, queries);

	const places: PlaceCategory[] = searchResults.map((r) => ({
		query: r.query,
		count: r.items.length,
		items: r.items
	}));

	// Step 3: Send tool results back and get final report
	const toolResponseData = searchResults.map((r) => ({
		query: r.query,
		results_count: r.items.length,
		places: r.items.map((item) => ({
			name: item.name,
			types: item.types.slice(0, 3),
			rating: item.rating ?? 'N/A',
			user_ratings: item.userRatingsTotal ?? 'N/A'
		}))
	}));

	const finalResponse = await ai.models.generateContent({
		model: 'gemini-3.1-flash-lite-preview', // gemini 3.1 model should be used
		contents: [
			{ role: 'user', parts: [{ text: userMessage }] },
			// Pass ALL parts from first response — gemini includes a thought_signature
			// that must be echoed back or the API returns a 400 error
			{ role: 'model', parts: candidate.content.parts },
			{
				role: 'user',
				parts: [
					{
						functionResponse: {
							name: 'search_nearby_places',
							response: { results: toolResponseData }
						}
					}
				]
			}
		],
		config: {
			systemInstruction: SYSTEM_PROMPT,
			temperature: 0.3,
			maxOutputTokens: 2500
		}
	});

	const finalCandidate = finalResponse.candidates?.[0];
	if (!finalCandidate?.content?.parts?.find((p) => p.text)) {
		console.error('[ai-report] Final response has no text part. Parts:', JSON.stringify(finalCandidate?.content?.parts?.map(p => Object.keys(p))));
	}
	const reportText =
		finalCandidate?.content?.parts?.find((p) => p.text)?.text ?? 'Failed to generate report.';

	return {
		report: reportText,
		queries_used: queries,
		places
	};
}
