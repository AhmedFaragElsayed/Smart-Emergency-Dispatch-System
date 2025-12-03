import axios from 'axios'

export const signinUser = async(userName, password) => {
    try{
        const response = await axios.post("http://localhost:9696/api/auth/signin", {
            "userName":userName,
            "password":password
        })
        return response.data;
    }catch(error){
        throw error.response ? error.response.data : error;
    }
};