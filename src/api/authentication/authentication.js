const { PrismaClient } = require('@prisma/client')
const Boom = require('@hapi/boom')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const _ = require('underscore')
const baseResult = require('../../utils/response-base.js');
const baseModel = require('../../utils/response-model.js')
const prismaClient = new PrismaClient();
const { signInValidate } = require('../validate/authen.validate')


const signIn = {
    handler: async (request, reply) => {
        try {
            const payload = request.payload
            const { value, error } = signInValidate.validate(payload)
            if (!error) {
                const findAuthen = await prismaClient.tb_authentications.findFirst({
                    where: {
                        username: value?.username
                    }
                })
                const password = findAuthen.password
                const passwordCompare = await bcrypt.compare(value.password, password)
                if (passwordCompare === true && findAuthen.access_status === 'Y') {
                    const token = jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, { algorithm: 'HS256', expiresIn: 600000000000 })
                    baseModel.IBaseSingleResultModel = {
                        status: true,
                        status_code: 200,
                        message: 'Sign in successfully',
                        result: {
                            token: token,
                            payload: payload,
                            time_out_token: 600000000000
                        },
                    }
                    return reply.response(await baseResult.IBaseSingleResult(baseModel.IBaseSingleResultModel))
                }
                else {
                    baseModel.IBaseSingleResultModel = {
                        status: false,
                        status_code: 500,
                        message: 'Sign in failed',
                        result: null
                    }
                    return reply.response(await baseResult.IBaseSingleResult(baseModel.IBaseSingleResultModel))
                }
            }
        }
        catch (e) {
            console.error(e)
            Boom.badImplementation()
        }
    }
}

module.exports = {
    signIn
}