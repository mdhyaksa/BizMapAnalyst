import { env } from '$env/dynamic/private';
import { GoogleGenAI, Type } from '@google/genai';
import { searchMultiple } from './google-places';
import type { PlaceCategory } from '$lib/types';

const SYSTEM_PROMPT = `You are a senior business location analyst. Given a business concept and its proposed location, you must:

1. First, use the search_nearby_places tool to find relevant nearby places. Choose up to 5 search queries that are most relevant for analyzing this business idea. Think about:
   - Direct competitors or similar businesses
   - Target customer sources (universities, offices, hospitals, etc.)
   - Complementary businesses
   - Infrastructure (transit, parking, etc.)
   - Other relevant establishments

2. After receiving the search results, produce a detailed business opportunity report in Markdown with these exact sections:

## Executive Summary
A 2-3 sentence overview of the location's viability for this business.

## Customer Segments
Identify 3-5 customer segments based on nearby places. For each: estimated volume, spending habits, peak hours.

## Market Saturation
Analyze existing competitors and similar businesses found nearby. Rate saturation as Low/Medium/High. Identify gaps and opportunities.

## Major Failure Modes
List the top 3-5 reasons this business could fail at this location. Be brutally honest and specific.

## Strategies to Combat Failures
For each failure mode above, provide a concrete, actionable strategy.

## Location Score
Rate 1-10 with a one-sentence justification.

Be specific, data-driven (reference actual places found), and actionable.`;

const searchToolDeclaration = {
	name: 'search_nearby_places',
	description:
		'Search for nearby places relevant to analyzing this business opportunity. Each query can be a Google Places type (e.g. "restaurant", "university", "hospital") or a specific business type (e.g. "bubble tea shop", "coworking space"). Choose up to 5 queries most relevant for assessing this business idea. Each query returns up to 6 results.',
	parameters: {
		type: Type.OBJECT,
		properties: {
			queries: {
				type: Type.ARRAY,
				items: { type: Type.STRING },
				description:
					'Array of search queries (max 5). Each should be a place type or business category relevant to the analysis.'
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

	const userMessage = `Business Idea: ${business_description}

Location: ${address} (${lat.toFixed(6)}, ${lng.toFixed(6)})
Search Radius: ${radius_m}m

Please search for relevant nearby places and then generate a business opportunity report.`;

	// Step 1: Initial call with tool
	const response = await ai.models.generateContent({
		model: 'gemini-2.0-flash',
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
		model: 'gemini-2.0-flash',
		contents: [
			{ role: 'user', parts: [{ text: userMessage }] },
			{
				role: 'model',
				parts: [
					{
						functionCall: {
							name: 'search_nearby_places',
							args: { queries }
						}
					}
				]
			},
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
	const reportText =
		finalCandidate?.content?.parts?.find((p) => p.text)?.text ?? 'Failed to generate report.';

	return {
		report: reportText,
		queries_used: queries,
		places
	};
}
