import 'source-map-support/register'
import { CustomAuthorizerEvent, CustomAuthorizerResult } from 'aws-lambda'
import { verify } from 'jsonwebtoken'
import { createLogger } from '../../utils/logger'
import Axios from 'axios'
import { JwtPayload } from '../../auth/JwtPayload'

const logger = createLogger('auth');
const jwksUrl = 'https://dev-xskges1x.us.auth0.com/.well-known/jwks.json';


export const handler = async (
  event: CustomAuthorizerEvent
): Promise<CustomAuthorizerResult> => {

  logger.info('Authorizing a user', event.authorizationToken)

  try {

    const jwtToken = await verifyToken(event.authorizationToken)
    logger.info('User was authorized', jwtToken)

    return {
      principalId: jwtToken.sub,
      policyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Action: 'execute-api:Invoke',
            Effect: 'Allow',
            Resource: '*'
          }
        ]
      }
    }
  } catch (e) {

    logger.error('User not authorized', { error: e.message })

    return {
      principalId: 'user',
      policyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Action: 'execute-api:Invoke',
            Effect: 'Deny',
            Resource: '*'
          }
        ]
      }
    }
  }
}

async function verifyToken(authHeader: string): Promise<JwtPayload> {
  try {

    const token = getToken(authHeader)
    const res = await Axios.get(jwksUrl);

    // You can read more about how to do this here: https://auth0.com/blog/navigating-rs256-and-jwks/
    const pemData = res['data']['keys'][0]['x5c'][0]
    const cert = `-----BEGIN CERTIFICATE-----\n${pemData}\n-----END CERTIFICATE-----`

    return verify(token, cert, { algorithms: ['RS256'] }) as JwtPayload
  } catch (err) {
    logger.error('Fail to authenticate', err)
  }
}

function getToken(authHeader: string): string {
  if (!authHeader) throw new Error('authentication header not Found')

  if (!authHeader.toLowerCase().startsWith('bearer '))
    throw new Error('authentication header is invalid')

  const split = authHeader.split(' ')
  const the_token = split[1]

  return the_token
}

