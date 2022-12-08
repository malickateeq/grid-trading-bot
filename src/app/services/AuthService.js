const Permission = require("../models/Permission");
const mongoose = require('mongoose');

class AuthService //extends Controller
{
    constructor() 
    {
        // super();
    }
    
    async syncPermission(payload = {}, options = {}) {
        await Permission.updateOne(
            { "role": payload.permission.role },
            {
                $set: {
                    "role": payload.permission.role,
                    "group": payload.permission.group,
                    "status": payload.permission.status,
                    "api_details": payload.permission.apiDetails,
                } 
            },
            {
                new: true,
                upsert: true,
            });
        console.log( " Event consumed! " );
    }

    async updateApiDetail(payload = {}, options = {}) {
        const permission = await Permission.updateMany(
            { "api_details._id": payload.apiDetail._id },
            {
                $set: {
                    "api_details.$.endpoint": payload.apiDetail.endpoint,
                    "api_details.$.method": payload.apiDetail.method,
                    "api_details.$.secret": payload.apiDetail.secret,
                    "api_details.$.timeout": payload.apiDetail.timeout,
                    "api_details.$.microservice": payload.apiDetail.microservice,
                    "api_details.$.status": payload.apiDetail.status,
                    // "api_details.$.user_type_id": payload.apiDetail.user_type_id
                } 
            }, {new: true})
        console.log( " Event consumed! " );

    }
    
    async deleteApiDetail(payload = {}, options = {}) {
        const permission = await Permission.updateMany(
            { "api_details._id": payload.id },
            
            {
                $pull:
                {api_details: {_id: payload.id}}
            }, 
            
        )
        console.log( " Event consumed! " );
    }
}

module.exports = new AuthService;