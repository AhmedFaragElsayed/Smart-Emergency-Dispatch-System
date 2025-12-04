import logo from '../assets/logo.png';
import React, {useState, useEffect} from 'react';
import { validateSignin } from '../utils/validateSignin';
import { signinUser } from '../api/SigninAPI';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function SigninPage(){

    const navigate = useNavigate();
    const { login, user } = useAuth();
    const [password, setPassword] = useState("");
    const [userName, setUserName] = useState("");
    const [errors, setErrors] = useState({});
    const [error, setError] = useState("");

    useEffect(() => {
      // Redirect if already logged in
      if (user) {
        navigate('/');
      }
    }, [user, navigate]);

    const handleSubmit = async (e) =>{
      e.preventDefault();

      setError("");
      setErrors({});
      
      const validation = validateSignin(userName, password);
      setErrors(validation);
      
      if(Object.keys(validation).length !== 0){
        return; 
      }

      try{
        const data = await signinUser(userName, password);
        console.log("Signin successful:", data);
        
        // Store user info in auth context
        login(data.id, { userName });
        
        navigate('/'); // Redirect to dashboard
        
      }catch(err){
        setError(err.message || "Signin failed");
      }
    };
    
    const isUserNameInvalid = () =>{
     
      if(userName.length > 100 ){
        return true;
      }
      return false;
    };

    const handlePassword = (e) =>{
      setPassword(e.target.value);
    };
    
    const handleUserName = (e) =>{
      setUserName(e.target.value);
    };


    return(
      <div className="flex min-h-full flex-col justify-center px-6 py-12 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-sm">
          <img
            alt="Emergency Dispatch"
            src={logo}
            className="mx-auto h-35 w-auto"
          />
          <h2 className="mt-4 text-center text-2xl/9 font-bold tracking-tight text-white">Sign in to your account</h2>
        </div>

        <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
          {error && (
            <div className="mb-4 rounded-md bg-red-900/20 border border-red-500/50 p-3 text-sm text-red-300">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="userName" className="block text-sm/6 font-medium text-gray-100">
                User name
              </label>
              <div className="mt-2">
                <input
                  id="userName"
                  name="userName"
                  type="userName"
                  value={userName}
                  required
                  autoComplete="userName"
                  className={`block w-full rounded-md px-3 py-1.5 text-base text-white outline outline-1 -outline-offset-1 placeholder:text-gray-500 focus:outline focus:outline-2 focus:-outline-offset-2 sm:text-sm/6 ${
                    isUserNameInvalid()
                      ? 'bg-red-900/20 outline-red-500/50 focus:outline-red-500' 
                      : 'bg-white/5 outline-white/10 focus:outline-indigo-500'
                  }`}
                  onChange={handleUserName}
                />
                {errors.userName && (
                  <p className="mt-1 text-sm text-red-400">{errors.userName}</p>
                )}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-sm/6 font-medium text-gray-100">
                  Password
                </label>
                <div className="text-sm">
                  <a href="#" className="font-semibold text-indigo-400 hover:text-indigo-300">
                    Forgot password?
                  </a>
                </div>
              </div>
              <div className="mt-2">
                <input
                  id="password"
                  name="password"
                  type="password"
                  value={password}
                  required
                  autoComplete="current-password"
                  className={`block w-full rounded-md px-3 py-1.5 text-base text-white outline outline-1 -outline-offset-1 placeholder:text-gray-500 focus:outline focus:outline-2 focus:-outline-offset-2 sm:text-sm/6 ${
                    password.length > 100 
                      ? 'bg-red-900/20 outline-red-500/50 focus:outline-red-500' 
                      : 'bg-white/5 outline-white/10 focus:outline-indigo-500'
                  }`}
                  onChange={handlePassword}
                />
                {errors.password && (
                  <p className="mt-1 text-sm text-red-400">{errors.password}</p>
                )}
              </div>
            </div>

            <div>
              <button
                type="submit"
                className="flex w-full justify-center rounded-md bg-indigo-500 px-3 py-1.5 text-sm/6 font-semibold text-white hover:bg-indigo-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
              >
                Sign in
              </button>
            </div>
          </form>
        </div>
      </div>

    )
}
export default SigninPage