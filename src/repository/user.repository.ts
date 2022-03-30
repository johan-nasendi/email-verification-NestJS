import {
    ConflictException,
    InternalServerErrorException,
  } from '@nestjs/common';
  import { EntityRepository, Repository } from 'typeorm';
  import { AuthCredentialDto } from '../auth/dto/create-user.dto';
  import { User } from '../entities/user.entity';
  import * as bcrypt from 'bcrypt';
  
  @EntityRepository(User)
  export class UserRepository extends Repository<User> {
    async createUser({
      username,
      password,
      email,
    }: AuthCredentialDto): Promise<User> {
      try {
        const salt = await bcrypt.genSalt();
        const hashedPassword = await bcrypt.hash(password, salt);
        const user = await this.save(
          this.create({
            username,
            email,
            password: hashedPassword,
          }),
        );
        return user;
      } catch (error) {
        if (error.code === '23505') {
          throw new ConflictException('This email already exists');
        } else {
          console.log(error);
          throw new InternalServerErrorException();
        }
      }
    }
  }
  