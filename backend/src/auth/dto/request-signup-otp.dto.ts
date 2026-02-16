import { IsEmail } from "class-validator";

export class RequestSignupOtpDto {
  @IsEmail()
  email!: string;
}
