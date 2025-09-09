export interface CreateProductDto {
  name: string;
  description?: string;
  price: number;
  category?: string;
  isActive?: boolean;
  stockQuantity?: number;
}

export interface UpdateProductDto {
  name?: string;
  description?: string;
  price?: number;
  category?: string;
  isActive?: boolean;
  stockQuantity?: number;
}

export interface ProductDto {
  id: number;
  name: string;
  description?: string;
  price: number;
  category?: string;
  isActive: boolean;
  stockQuantity?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductsQueryDto {
  page?: number;
  limit?: number;
  category?: string;
  isActive?: boolean;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}
