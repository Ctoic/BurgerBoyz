import { IsString, MaxLength, MinLength } from "class-validator";

export class CreateNotificationDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  title!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(500)
  description!: string;
}
