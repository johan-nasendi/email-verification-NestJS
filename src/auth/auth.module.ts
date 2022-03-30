import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MailerModule } from '@nestjs-modules/mailer';
import { UserRepository } from 'src/repository/user.repository';
import { Verification } from 'src/entities/verification.entity';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
@Module({
  imports: [
    PassportModule.register({defaultStrategy: 'jwt'}),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        expiresIn: `${config.get<string>(
          'JWT_ACCESS_TOKEN_EXPIRATION_TIME',
        )}d`,
      }),
    }),

    TypeOrmModule.forFeature([UserRepository,Verification]),
    MailerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        transport: {
          service: config.get<string>('MAILGUN_API_DOMAIN'),
          host: config.get<string>('SMTP_HOST_NAME'),
          port: config.get<number>('EMIAL_PORT'),
          auth: {
            user: config.get<string>('EMAIL_USERNAME'), // generated ethereal user
            pass: config.get<string>('EMIAL_PASSD'), // generated ethereal password
          },
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService,JwtStrategy,JwtRefreshStrategy],
  exports: [JwtStrategy,JwtRefreshStrategy, PassportModule],
})
export class AuthModule {}
