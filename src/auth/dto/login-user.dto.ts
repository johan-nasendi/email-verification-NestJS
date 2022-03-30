import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
    IsNotEmpty,
    IsString,
    Matches,
    MaxLength,
    MinLength,
  } from 'class-validator';
  
  export class LoginInputDto {

  
  
    @IsNotEmpty()
    @IsEmail()
    @ApiProperty()
    email: string;

    @IsNotEmpty()
    @ApiProperty()
    @IsString()
    @MinLength(8)
    @MaxLength(20)
    @Matches(
      /^(?=.*[a-zA-Z])(?=.*[0-9])(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]{8,20}$/,
      {
        message: 'wrong password!..',
      },
    )
    password: string;
  }
  