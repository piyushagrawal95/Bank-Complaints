const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
const TOKEN_KEY="complaints_token"


export function getToken(){
    return localStorage.getItem(TOKEN_KEY);
}

export function saveToken(token){
    localStorage.setItem(TOKEN_KEY,token);
}

export function clearToken(){
    localStorage.removeItem(TOKEN_KEY);
}

// App.jsx registers a function here. It is called when the server says the login is no longer valid so the app can show the login page
let onUnauthorized=()=>{};
export function setUnauthorizedHandler(fn){
    onUnauthorized=fn;
}

async function request(path, { method="GET", params = {},body } ={}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== "" && value !== null && value !== undefined) {
      query.append(key, value);
    }
  });
  const queryString = query.toString();
  const url = `${API_URL}${path}${queryString ? "?" + queryString : ""}`;

  const headers={};
  const token = getToken();
  if(token){
    headers.Authorization=`Bearer ${token}`;
  }
  if(body!=undefined){
    headers["Content-Type"]="application/json"
  }

  let response;
  try {
    response = await fetch(url,{
        method,
        headers,
        body:body!=undefined?JSON.stringify(body):undefined,
    });
  } catch {
    throw new Error("Cannot reach the server. Please check that the backend is running.");
  }

  if (!response.ok) {
    let message = `Request failed (status ${response.status})`;
    try {
      const body = await response.json();
      if (typeof data.detail === "string") message = body.detail;
      else if (Array.isArray(data.detail)){
        message="Please check the values you entered (valid email,password of at least 8 characters)";
      }
    } catch {
      // the response had no JSON body, keep the default message
    }
    if (response.status === 401 && token && path !== "/auth/login") {
      onUnauthorized();
    }
    throw new Error(message);
  }
  return response.json();
}

export const login =(email,password)=> request("/auth/login",{method:"POST",body:{email,password}});

export const signup=(email,password,fullName)=> request("/auth/signup",{
    method:"POST",
    body:{email,password,full_name:fullName||null}
});

export const getMe=()=> request("/auth/me")
export const getComplaints = (params) => request("/complaints", params);
export const getProducts = () => request("/complaints/meta/products");