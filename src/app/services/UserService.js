const Service = require('./Service');
const User = require("../models/User");
const Group = require('../models/Group');
    
class UserService extends Service 
{
    constructor() 
    {
        super();
    }
    async createUser(payload = {}, options = {}) 
    {
        const authUser = payload.user;
        const group = await Group.findOne({ is_default: 1 }).exec();
        if(!group)
        {
            // Ask kafka to resend this event
            return 0;
        }
        
        const user = new User({
            "_id": authUser._id,
            "first_name": authUser?.first_name,
            "last_name": authUser?.last_name,
            "user_type": authUser?.user_type_id ?? null,
            "group": group?._id ?? null,  //Default Group or Assign Group
            "email": authUser?.email,
            "phone": authUser?.phone ?? null,
            "country_code": authUser?.country_code,
            "status": authUser.status,
        });
        await user.save();

        console.log(" Event consumed! ");
    }

    async updateUser(payload = {}, options = {}) 
    {
        const group = await Group.findOne({ is_default: 1 }).exec();

        const user = await User.findOneAndUpdate(
            { _id: payload.user._id },
            {
                "first_name": payload.user.firstName,
                "last_name": payload.user.lastName,
                "user_type": payload.user.userTypeId,
                "group": group?._id ?? null,  //Default Group or Assign Group
                "email": payload.user.email,
                "phone": payload?.phone ?? null,
                "password": payload.user.password,
                "status": payload.user.status,
            }
        ).exec();

        console.log( " Event consumed! " );

    }
    
    async deleteUser(payload = {}, options = {}) 
    {
        const user = await User.deleteOne({
            "_id": payload.user._id
        }).exec();

        console.log( " Event consumed! " );

    }

    async updateUserEmail(payload = {}, options = {}) 
    {
        const user = await User.findOneAndUpdate(
            { _id: payload.user },
            {
                "email": payload.email,
            }
        ).exec();
        console.log( " Event consumed! " );
    }
    
    async updateUserPhone(payload = {}, options = {}) 
    {
        await User.findOneAndUpdate(
            { _id: payload.user },
            {
                "phone": payload.phone,
                "country_code": payload.countryCode
            }
        ).exec();
        console.log( " Event consumed! " );
    }
}

module.exports = new UserService;