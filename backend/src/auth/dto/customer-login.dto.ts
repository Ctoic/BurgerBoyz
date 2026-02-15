import { IsEmail } from "class-validator";

export class CustomerLoginDto {
  @IsEmail()
  email!: string;
}
