const { PrismaClient } = require('@prisma/client');
const Boom = require('@hapi/boom');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { generateAccessToken, jwtDecode, generateRefreshToken, jwtVerifyRefreshToken } = require('../../utils/authentication.js')
const _ = require('underscore');
const baseResult = require('../../utils/response-base.js');
const baseModel = require('../../utils/response-model.js');
const prismaClient = new PrismaClient();
const httpResponse = require('../../constant/http-response.js');
const authenValidate = require('../validate/authen.validate');


const signIn = {
    auth: false,
    handler: async (request, reply) => {
        try {
            const payload = request.payload
            const { value, error } = authenValidate.signInValidate.validate(payload)
            if (!error) {
                const findAuthen = await prismaClient.tb_authentications.findFirst({
                    where: {
                        username: value?.username
                    }
                })
                if(_.isEmpty(findAuthen)){
                    baseModel.IBaseSingleResultModel = {
                        status: false,
                        status_code: httpResponse.STATUS_200.status_code,
                        message: 'Sign in failed',
                        result: null
                    }
                    return reply.response(await baseResult.IBaseSingleResult(baseModel.IBaseSingleResultModel))
                }
                const password = findAuthen.password
                const passwordCompare = await bcrypt.compare(value.password, password)
                if (passwordCompare === true && findAuthen.access_status === 'Y') {
                    const payloadJWT = {
                        id: findAuthen.id,
                        username: findAuthen.username,
                        name: findAuthen.name,
                        lastname: findAuthen.lastname
                    }
                    const token = await generateAccessToken(payloadJWT);
                    const refreshToken = await generateRefreshToken(payloadJWT);
                    const tokenDecode = await jwtDecode(token);
                    baseModel.IBaseSingleResultModel = {
                        status: true,
                        status_code: httpResponse.STATUS_200.status_code,
                        message: 'Sign in successfully',
                        result: {
                            access_token: token,
                            refresh_token: refreshToken,
                            payload: tokenDecode,
                        },
                    }
                    return reply.response(await baseResult.IBaseSingleResult(baseModel.IBaseSingleResultModel))
                }
                else {
                    baseModel.IBaseSingleResultModel = {
                        status: false,
                        status_code: httpResponse.STATUS_200.status_code,
                        message: 'Sign in failed',
                        result: null
                    }
                    return reply.response(await baseResult.IBaseSingleResult(baseModel.IBaseSingleResultModel))
                }
            }
            else {
                baseModel.IBaseNocontentModel = {
                    status: false,
                    status_code: httpResponse.STATUS_400.status_code,
                    message: httpResponse.STATUS_400.message,
                    error_message: httpResponse.STATUS_400.message,
                }
                return reply.response(await baseResult.IBaseNocontent(baseModel.IBaseNocontentModel))
            }
        }
        catch (e) {
            console.error(e)
            Boom.badImplementation()
        }
    }
}

const refreshToken = {
    auth: false,
    handler: async (request, reply) => {
        try {

            const refreshToken = request.headers.authorization.replace("Bearer ", "");
            const responseRefreshToken = await jwtVerifyRefreshToken(refreshToken);
            if (responseRefreshToken.isValid != false) {
                const findAuthen = await prismaClient.tb_authentications.findFirst({
                    where : {
                        username : responseRefreshToken?.payload?.username
                    }
                });
                if(!_.isEmpty(findAuthen)){
                    const payloadJWT = {
                        id: findAuthen.id,
                        username: findAuthen.username,
                        name: findAuthen.name,
                        lastname: findAuthen.lastname
                    }
                    const accessToken = await generateAccessToken(payloadJWT,process.env.REFRESH_TOKEN_EXPIRATION);
                    const tokenDecode = await jwtDecode(accessToken);
                    baseModel.IBaseSingleResultModel = {
                        status: true,
                        status_code: httpResponse.STATUS_200.status_code,
                        message: 'Refresh token successfully',
                        result: {
                            access_token: accessToken,
                            refresh_token: refreshToken,
                            payload: tokenDecode,
                        },
                    }
                    return reply.response(await baseResult.IBaseSingleResult(baseModel.IBaseSingleResultModel)) 
                }
                return Boom.unauthorized()
            }
            return Boom.unauthorized()
        }
        catch (e) {
            console.error(e)
            Boom.badImplementation()
        }
    }
}

const registerMembers = {
    auth: false,
    handler: async (request, reply) => {
        try {
            const payload = request.payload
            const { value, error } = authenValidate.registerMembers.validate(payload)
            if (!error) {
                const findDuplicates = await prismaClient.tb_members.findFirst({
                    where: {
                        member_username: value.member_username
                    }
                });
                if (_.isEmpty(findDuplicates)) {
                    let math = Math.random() * 10000000
                    let newMath = Math.ceil(math);
                    let _id = "MEMBER" + String(newMath);
                    const salt = await bcrypt.genSalt(10);
                    const hash = await bcrypt.hash(value.member_password, salt);
                    const bodyMembers = {
                        member_id: _id,
                        member_username: value.member_username,
                        member_password: hash,
                        member_name: value.member_name,
                        member_lastname: value.member_lastname,
                        member_tel: "",
                        member_address: "",
                        member_email: value.member_email,
                        member_avatar: "https://avataaars.io/?avatarStyle=Transparent&topType=ShortHairShortCurly&accessoriesType=Round&hairColor=BrownDark&facialHairType=BeardMedium&facialHairColor=BrownDark&clotheType=BlazerShirt&eyeType=Default&eyebrowType=Default&mouthType=Default&skinColor=Light",
                        member_status: "Y",
                        role: "member"
                    }
                    const bodyAuthen = {
                        auth_id: bodyMembers.member_id,
                        username: bodyMembers.member_username,
                        password: bodyMembers.member_password,
                        name: bodyMembers.member_name,
                        lastname: bodyMembers.member_lastname,
                        avatar: bodyMembers.member_avatar,
                        access_status: bodyMembers.member_status,
                        role: bodyMembers.role
                    }
                    const t = await prismaClient.$transaction([
                        prismaClient.tb_members.create({
                            data: bodyMembers
                        }),
                        prismaClient.tb_authentications.create({
                            data: bodyAuthen
                        })
                    ]);
                    if (!_.isEmpty(t)) {
                        baseModel.IBaseNocontentModel = {
                            status: true,
                            status_code: httpResponse.STATUS_CREATED.status_code,
                            message: httpResponse.STATUS_CREATED.message,
                            error_message: '',
                        }
                        return reply.response(await baseResult.IBaseNocontent(baseModel.IBaseNocontentModel))
                    }
                    baseModel.IBaseNocontentModel = {
                        status: false,
                        status_code: httpResponse.STATUS_500.status_code,
                        message: httpResponse.STATUS_500.message,
                        error_message: httpResponse.STATUS_500.message,
                    }
                    return reply.response(await baseResult.IBaseNocontent(baseModel.IBaseNocontentModel))
                }
                else {
                    baseModel.IBaseNocontentModel = {
                        status: false,
                        status_code: httpResponse.STATUS_400.status_code,
                        message: 'Invalid Duplicate Username',
                        error_message: httpResponse.STATUS_400.message,
                    }
                    return reply.response(await baseResult.IBaseNocontent(baseModel.IBaseNocontentModel))
                }

            }
            else {
                baseModel.IBaseNocontentModel = {
                    status: false,
                    status_code: httpResponse.STATUS_400.status_code,
                    message: httpResponse.STATUS_400.message,
                    error_message: httpResponse.STATUS_400.message,
                }
                return reply.response(await baseResult.IBaseNocontent(baseModel.IBaseNocontentModel))
            }
        }
        catch (e) {
            console.error(e)
            Boom.badImplementation()
        }
    }
}

const registerOrganizer = {
    auth: false,
    handler: async (request, reply) => {
        try {
            const payload = request.payload
            const { value, error } = authenValidate.registerOrganizer.validate(payload)
            if (!error) {
                const findDuplicates = await prismaClient.tb_organizers.findFirst({
                    where: {
                        organ_username: value.organ_username
                    }
                });
                if (_.isEmpty(findDuplicates)) {
                    let math = Math.random() * 10000000
                    let newMath = Math.ceil(math);
                    let _id = "ORGANIZER" + String(newMath);
                    const salt = await bcrypt.genSalt(10);
                    const hash = await bcrypt.hash(value.organ_password, salt);
                    const bodyOrganizer = {
                        organ_id: _id,
                        organ_username: value.organ_username,
                        organ_password: hash,
                        organ_name: value.organ_name,
                        organ_lastname: value.organ_lastname,
                        organ_tel: "",
                        organ_address: "",
                        organ_email: value.organ_email,
                        organ_avatar: "https://avataaars.io/?avatarStyle=Transparent&topType=ShortHairShortCurly&accessoriesType=Round&hairColor=BrownDark&facialHairType=BeardMedium&facialHairColor=BrownDark&clotheType=BlazerShirt&eyeType=Default&eyebrowType=Default&mouthType=Default&skinColor=Light",
                        organ_status: "N",
                        role: "organizer"
                    }
                    const bodyAuthen = {
                        auth_id: bodyOrganizer.organ_id,
                        username: bodyOrganizer.organ_username,
                        password: bodyOrganizer.organ_password,
                        name: bodyOrganizer.organ_name,
                        lastname: bodyOrganizer.organ_lastname,
                        avatar: bodyOrganizer.organ_avatar,
                        access_status: bodyOrganizer.organ_status,
                        role: bodyOrganizer.role
                    }
                    const t = await prismaClient.$transaction([
                        prismaClient.tb_organizers.create({
                            data: bodyOrganizer
                        }),
                        prismaClient.tb_authentications.create({
                            data: bodyAuthen
                        })
                    ]);
                    if (!_.isEmpty(t)) {
                        baseModel.IBaseNocontentModel = {
                            status: true,
                            status_code: httpResponse.STATUS_CREATED.status_code,
                            message: httpResponse.STATUS_CREATED.message,
                            error_message: '',
                        }
                        return reply.response(await baseResult.IBaseNocontent(baseModel.IBaseNocontentModel))
                    }
                    baseModel.IBaseNocontentModel = {
                        status: false,
                        status_code: httpResponse.STATUS_500.status_code,
                        message: httpResponse.STATUS_500.message,
                        error_message: httpResponse.STATUS_500.message,
                    }
                    return reply.response(await baseResult.IBaseNocontent(baseModel.IBaseNocontentModel))
                }
                else {
                    baseModel.IBaseNocontentModel = {
                        status: false,
                        status_code: httpResponse.STATUS_400.status_code,
                        message: 'Invalid Duplicate Username',
                        error_message: httpResponse.STATUS_400.message,
                    }
                    return reply.response(await baseResult.IBaseNocontent(baseModel.IBaseNocontentModel))
                }
            }
            else {
                baseModel.IBaseNocontentModel = {
                    status: false,
                    status_code: httpResponse.STATUS_400.status_code,
                    message: httpResponse.STATUS_400.message,
                    error_message: httpResponse.STATUS_400.message,
                }
                return reply.response(await baseResult.IBaseNocontent(baseModel.IBaseNocontentModel))
            }
        }
        catch (e) {
            console.error(e)
            Boom.badImplementation()
        }
    }
}

// const updateprofileMembers = {
//     handler: async (request, reply) => {
//         try {

//         }
//         catch (e) {

//         }
//     }
// }


module.exports = {
    signIn,
    refreshToken,
    registerMembers,
    registerOrganizer,
}