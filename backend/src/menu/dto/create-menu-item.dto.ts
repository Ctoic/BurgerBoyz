import { IsArray, IsBoolean, IsInt, IsOptional, IsString, Min, ArrayUnique } from "class-validator";

export class CreateMenuItemDto {
  @IsString()
  categoryId!: string;

  @IsString()
  name!: string;

  @IsString()
  description!: string;

  @IsInt()
  @Min(0)
  priceCents!: number;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsBoolean()
  isPopular?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  addOnIds?: string[];
}
