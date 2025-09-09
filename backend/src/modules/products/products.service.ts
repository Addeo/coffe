import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../../entities/product.entity';
import {
  CreateProductDto,
  UpdateProductDto,
  ProductsQueryDto,
} from '../../../shared/dtos/product.dto';

export interface ProductsResponse {
  data: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>
  ) {}

  async create(createProductDto: CreateProductDto): Promise<Product> {
    const product = this.productsRepository.create(createProductDto);
    return this.productsRepository.save(product);
  }

  async findAll(query: ProductsQueryDto = {}): Promise<ProductsResponse> {
    const {
      page = 1,
      limit = 10,
      category,
      isActive,
      minPrice,
      maxPrice,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = query;

    const queryBuilder = this.productsRepository.createQueryBuilder('product');

    if (category) {
      queryBuilder.andWhere('product.category = :category', { category });
    }

    if (isActive !== undefined) {
      queryBuilder.andWhere('product.isActive = :isActive', { isActive });
    }

    if (minPrice !== undefined) {
      queryBuilder.andWhere('product.price >= :minPrice', { minPrice });
    }

    if (maxPrice !== undefined) {
      queryBuilder.andWhere('product.price <= :maxPrice', { maxPrice });
    }

    queryBuilder
      .orderBy(`product.${sortBy}`, sortOrder)
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: number): Promise<Product> {
    const product = await this.productsRepository.findOne({ where: { id } });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async update(id: number, updateProductDto: UpdateProductDto): Promise<Product> {
    const product = await this.findOne(id);

    Object.assign(product, updateProductDto);
    return this.productsRepository.save(product);
  }

  async remove(id: number): Promise<void> {
    const product = await this.findOne(id);
    await this.productsRepository.remove(product);
  }

  async getCategories(): Promise<string[]> {
    const result = await this.productsRepository
      .createQueryBuilder('product')
      .select('product.category', 'category')
      .where('product.category IS NOT NULL')
      .andWhere('product.category != :empty', { empty: '' })
      .groupBy('product.category')
      .getRawMany();

    return result.map(row => row.category);
  }

  async getProductStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    totalValue: number;
    averagePrice: number;
  }> {
    const stats = await this.productsRepository
      .createQueryBuilder('product')
      .select([
        'COUNT(*) as total',
        'SUM(CASE WHEN product.isActive = 1 THEN 1 ELSE 0 END) as active',
        'SUM(CASE WHEN product.isActive = 0 THEN 1 ELSE 0 END) as inactive',
        'SUM(product.price * product.stockQuantity) as totalValue',
        'AVG(product.price) as averagePrice',
      ])
      .getRawOne();

    return {
      total: parseInt(stats.total) || 0,
      active: parseInt(stats.active) || 0,
      inactive: parseInt(stats.inactive) || 0,
      totalValue: parseFloat(stats.totalValue) || 0,
      averagePrice: parseFloat(stats.averagePrice) || 0,
    };
  }

  async updateStock(id: number, quantity: number): Promise<Product> {
    const product = await this.findOne(id);
    product.stockQuantity = quantity;
    return this.productsRepository.save(product);
  }

  async bulkUpdateStatus(productIds: number[], isActive: boolean): Promise<void> {
    await this.productsRepository
      .createQueryBuilder()
      .update(Product)
      .set({ isActive })
      .where('id IN (:...ids)', { ids: productIds })
      .execute();
  }
}
