import { ForbiddenException, HttpException, HttpStatus, Injectable, Req, Res, UnauthorizedException } from '@nestjs/common';
import { Response } from 'express';
import { JwtService } from 'src/services/jwt.service';
import { PrismaService } from 'src/services/prisma.service';

@Injectable()
export class AuthService {
	constructor(
		private readonly jwtService: JwtService,
		private readonly prismaService: PrismaService,
	) {}

	// Get User Access Token (42.AUTH)
	async accessToken(code: string | any) {
		const formData = {
			"grant_type": 'authorization_code',
			"client_id": `${process.env.API_UID}`,
			"client_secret": `${process.env.API_SECRET_KEY}`,
			"code": `${code}`,
			"redirect_uri": `${process.env.API_REDIRECT_URL}`,
		}
    try {
			const response = await fetch('https://api.intra.42.fr/oauth/token', {
  			method: 'POST',
  			headers: { 'Content-Type': 'application/json' },
  			body: JSON.stringify(formData),
			});
      if (!response.ok) {
        throw new HttpException({
            status: HttpStatus.BAD_REQUEST,
            error: "Cant get the user token"
          },
           HttpStatus.BAD_REQUEST); 
        }
			const data = await response.json()
      return data;

    } catch (error) {
			return null
    }
	}

	// Get User Information (42.AUTH)
	async accessAuthUserInfo(accessToken: string) {    
    try {
      const response = await fetch("https://api.intra.42.fr/v2/me", {
        method: "GET",
        headers: { Authorization: `Bearer ${accessToken}` }
      })
      if (response.ok) {
        const data = await response.json()
        return data;
      } else {
				throw new ForbiddenException()
			}
    }
    catch(error) {
			throw Error(error) 
    }
  }

	// login
	async login(code: string, @Res() res: Response) {
		const token = await this.accessToken(code)
		if (!token) {
			res.redirect(`${process.env.FRONTEND_URL}/login`)
			throw new UnauthorizedException('Unauthorized')
		}
		try {
			const user = await this.accessAuthUserInfo(token.access_token)
			let authUser = await this.prismaService.findUserByEmail(user.email)
			if (!authUser) {
				await this.prismaService.createUser({
					username: user.login,
					email: user.email,
					avatar: user.image.link
				})
				authUser = await this.prismaService.findUserByEmail(user.email)
			}
			const access_token = this.jwtService.generateToken({
				id: authUser.id,
				email: authUser.email,
			})
			res.redirect(`${process.env.FRONTEND_URL}/auth?tranc_token=${access_token}`)
		} catch (error) {
			res.redirect(`${process.env.FRONTEND_URL}/login`)
		}
	}

	// Authenticate logged user 
	async authenticate(@Req() req: Request) {
		const authorization = req.headers['authorization']
		if (!authorization) {
			throw new HttpException('Bad Request - Missing Authorization token', HttpStatus.BAD_REQUEST);
		}
		const token = authorization.split(' ')[1]
		const user = this.jwtService.verifyToken(token)
		const us = await this.prismaService.findUserByEmail(user.email)
		return {
			username: us.username,
			avatar: us.avatar,
		}
	}
}
