import { IsIn, IsOptional, IsString, Matches, MaxLength } from "class-validator";
import { PaginationQueryDto } from "../../common/dto/pagination-query.dto";

const VIEW_OPTIONS = ["active", "past"] as const;

export class ListUserOrdersQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(VIEW_OPTIONS)
  view?: "active" | "past";

  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date?: string;
}

