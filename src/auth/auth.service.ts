import { MailerService } from '@nestjs-modules/mailer';
import { Injectable,UnauthorizedException,InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Verification } from 'src/entities/verification.entity';
import { UserRepository } from 'src/repository/user.repository';
import { EventEmitter } from 'stream';
import { Repository } from 'typeorm';
import { AuthCredentialDto } from './dto/create-user.dto';
import { LoginInputDto } from './dto/login-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {

    private readonly emitter = new EventEmitter();
    constructor(
        @InjectRepository(UserRepository)
        private readonly userRepository: UserRepository,
        @InjectRepository(Verification)
        private readonly verification: Repository<Verification>,
        private readonly jwtService: JwtService,
        private readonly mailerService: MailerService,
        private readonly configService: ConfigService,
      ) {}


      async signUp(authCredentialDto: AuthCredentialDto): Promise<{ ok: boolean }> {
        const user = await this.userRepository.createUser(authCredentialDto);
        try {
          const verification = await this.verification.save(
            this.verification.create({
              user,
            }),
          );
          //sendEmail
          this.sendMail(user.email, verification.code);
          return { ok: true };
        } catch (error) {
          console.log(error);
          throw new InternalServerErrorException();
        }
      }
    
      async login({ email, password }: LoginInputDto) {
        const user = await this.userRepository.findOne({ email });
        if (!user) {
          throw new UnauthorizedException('User does not exist.');
        }
        const match = await bcrypt.compare(password, user.password);
        if (!match) {
          throw new UnauthorizedException('password is wrong.');
        }
        //이메일 인증되지 않은 사용자 에러처리
        if (!user.verified) {
          throw new UnauthorizedException('Email verification is required.');
        }
        //유저 토큰 생성 (Secret + playload)
        // const payload = { email };
        // const accessToken = await this.jwtService.sign(payload);
        const { accessToken, accessOption } =
          await this.getCookieWithJwtAccessToken(email);
        const { refreshToken, refreshOption } =
          await this.getCookieWithJwtRefreshToken(email);
        await this.updateRefreshTokenInUser(refreshToken, email);
        const returnUser = await this.userRepository
          .createQueryBuilder('user')
          .select([
            'user.id',
            'user.username',
            'user.email',
            'user.verified',
          ])
          .where('user.email = :email', { email })
          .getOne();
        return {
          accessToken,
          accessOption,
          refreshToken,
          refreshOption,
          user: returnUser,
        };
      }
    
      async sendMail(email: string, code: string) {
        try {
          await this.mailerService.sendMail({
            to: email, // list of receivers
            from: `${this.configService.get<string>('EMAIL_ID')}@johan.com`, // sender address
            subject: 'Email verification request email.', // Subject line
            html: `<a href="http://localhost:3050/auth/email/?code=${code}">Verification Link Authenticate</a>`, // HTML body content
          });
          //front로 redirect시켜주기
          return { ok: true };
        } catch (error) {
          console.log(error);
        }
      }
    
      async emailAuth({
        code,
      }: {
        code: string;
      }): Promise<{ ok: boolean; message: string }> {
        try {
          const verification = await this.verification.findOne(
            { code },
            { relations: ['user'] },
          );
          if (verification) {
            verification.user.verified = true;
            this.userRepository.save(verification.user);
          }
          // Delete email verification code and grant verification code validity period
          return {
            ok: true,
            message: '!Please log in to get started',
          };
        } catch (error) {
          console.log(error);
          return {
            ok: false,
            message: 'Email authentication failed. please try again',
          };
        }
      }
    
      //accessToken 전달
      async getCookieWithJwtAccessToken(email: string) {
        const payload = { email };
        const token = this.jwtService.sign(payload, {
          secret: this.configService.get('JWT_SECRET'),
          expiresIn: 60*60,
          algorithm: 'HS256',
        });
        return {
          accessToken: token,
          accessOption: {
            domain: 'localhost',
            path: '/',
            httpOnly: true,
            maxAge:2 * 60 * 60 * 1000,
          },
        };
      }
    
      //refreshToken 전달
      async getCookieWithJwtRefreshToken(email: string) {
        const payload = { email };
        const token = this.jwtService.sign(payload, {
          secret: this.configService.get('JWT_SECRET'),
          expiresIn: 60*60,
          algorithm: 'HS256',
        });
        return {
          refreshToken: token,
          refreshOption: {
            domain: 'localhost',
            path: '/',
            maxAge:2 * 60 * 60 * 1000,
            httpOnly: true,
            
              
          },
        };
      }
    
      // RefreshToken 암호화 and 저장
      async updateRefreshTokenInUser(refreshToken: string, email: string) {
        if (refreshToken) {
          refreshToken = await bcrypt.hash(refreshToken, 10);
        }
        await this.userRepository.update(
          { email },
          {
            currentHashedRefreshToken: refreshToken,
          },
        );
      }
    
      // RefreshToken
      async getUserRefreshTokenMatches(
        refreshToken: string,
        email: string,
      ): Promise<{ result: boolean }> {
        const user = await this.userRepository.findOne({ email });
        if (!user) {
          throw new UnauthorizedException('User does not exist.');
        }
        const isRefreshTokenMatch = await bcrypt.compare(
          refreshToken,
          user.currentHashedRefreshToken,
        );
        if (isRefreshTokenMatch) {
          // await this.updateRefreshTokenInUser(null, email);
          return { result: true };
        } else {
          throw new UnauthorizedException();
        }
      }
    
      async removeRefreshToken(email: string) {
        return this.userRepository.update(
          { email },
          {
            currentHashedRefreshToken: null,
          },
        );
      }
    
      async logOut(email: string) {
        await this.removeRefreshToken(email);
      }
    
      async getNewAccessAndRefreshToken(email: string) {
        const { refreshToken } = await this.getCookieWithJwtRefreshToken(email);
        await this.updateRefreshTokenInUser(refreshToken, email);
        return {
          accessToken: await this.getCookieWithJwtAccessToken(email),
          refreshToken,
        };
      }
    
      getCookiesForLogOut() {
        return {
          accessOption: {
            domain: 'localhost',
            path: '/',
            httpOnly: true,
            maxAge: 0,
          },
          refreshOption: {
            domain: 'localhost',
            path: '/',
            httpOnly: true,
            maxAge: 0,
          },
        };
      }
}
