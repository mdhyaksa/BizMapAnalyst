export interface PlaceItem {
	name: string;
	types: string[];
	lat: number;
	lng: number;
	rating?: number;
	userRatingsTotal?: number;
}

export interface PlaceCategory {
	query: string;
	count: number;
	items: PlaceItem[];
}

export interface ReportRequest {
	lat: number;
	lng: number;
	business_description: string;
	radius_m: number;
}

export interface ReportResponse {
	report: string;
	address: string;
	radius_m: number;
	queries_used: string[];
	places: PlaceCategory[];
}
