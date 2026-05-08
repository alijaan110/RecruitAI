export interface APIResponse<T> { success: boolean; data: T; message?: string }
export interface PaginatedResponse<T> {
  items: T[]; total: number; page: number; pages: number; limit: number
}
export interface APIError { success: false; error: string; code: string }
