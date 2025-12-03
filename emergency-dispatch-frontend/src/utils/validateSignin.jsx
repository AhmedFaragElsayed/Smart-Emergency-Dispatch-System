
export function validateSignin(userName, password){
    const errors = {}

    if(!userName){
        errors.userName = "UserName is required"
    }else if(userName.length > 100){
        errors.userName = "UserName is invalid";
    }
    if(!password){
        errors.password = "password is required"
    }else if(password.length > 100){
        errors.password = "password is invalid";
    }

    return errors
}