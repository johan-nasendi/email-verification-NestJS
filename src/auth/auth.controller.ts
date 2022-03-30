import { Body,Query, Controller,Redirect, Get, Logger, Post, Res, UseGuards, ValidationPipe } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthCredentialDto } from './dto/create-user.dto';
import { LoginInputDto } from './dto/login-user.dto';
import { Response, } from 'express';
import { GetUser } from './get-user.decorator';
import { AuthGuard } from '@nestjs/passport';
import { User } from 'src/entities/user.entity';
import { JwtRefreshTokenGuard } from './guards/jwt-refresh.guard';

@Controller('auth')
export class AuthController {

    private logger = new Logger('AuthController');
    constructor(private authService: AuthService) {}
  
    @Post('/join')
    signUp(
      @Body(ValidationPipe) authCredentialDto: AuthCredentialDto,
    ): Promise<{ ok: boolean }> {
      return this.authService.signUp(authCredentialDto);
    }
  
    @Post('/login')
    async login(
      @Res({ passthrough: true }) res: Response,
      @Body(ValidationPipe) loginInputDto: LoginInputDto,
    ) {
      const { accessToken, accessOption, refreshToken, refreshOption, user } =
        await this.authService.login(loginInputDto);
      res.cookie('Authentication', accessToken, accessOption);
      res.cookie('Refresh', refreshToken, refreshOption);
      return { user };
    }
  
    @Get('/user')
    @UseGuards(AuthGuard())
    getUser(@GetUser() user: User) {
      return user;
    }
  
    @Post('/refresh')
    @UseGuards(JwtRefreshTokenGuard)
    async refresh(
      @Res({ passthrough: true }) res: Response,
      @GetUser() user: User,
    ) {
      this.logger.verbose(`User: ${user.username} trying to refreshToken`);
      if (user) {
        const { accessToken, accessOption } =
          await this.authService.getCookieWithJwtAccessToken(user.email);
        res.cookie('Authentication', accessToken, accessOption);
        return { user };
      }
    }
  
    @Get('/logout')
    @UseGuards(JwtRefreshTokenGuard)
    async logOut(
      @Res({ passthrough: true }) res: Response,
      @GetUser() user: User,
    ) {
      const { accessOption, refreshOption } =
        this.authService.getCookiesForLogOut();
      await this.authService.removeRefreshToken(user.email);
      res.cookie('Authentication', '', accessOption);
      res.cookie('Refresh', '', refreshOption);
    }
  
    // @Get('/email/:code')
    // async sendMail(@Param('code') code: string) {
    //   return this.authService.sendMail(code);
    // }
  
    @Get('/email')
    @Redirect('http://localhost:3050', 302)
    async emailAuth(
      @Query() emailAuthDto: { code: string },
    ): Promise<{ url: string }> {
      const { ok, message } = await this.authService.emailAuth(emailAuthDto);
      if (ok) {
        return { url: `http://localhost:3050/auth/login?message=${message}` };
      } else {
        return { url: `http://localhost:3050/auth/join?message=${message}` };
      }
    }

}
