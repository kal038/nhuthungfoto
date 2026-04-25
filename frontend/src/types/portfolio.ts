export interface PortfolioPhoto {
  key: string
  url: string
  uploaded: string
}

export interface PortfolioListResponse {
  photos: Array<{ key: string; uploaded: string }>
}