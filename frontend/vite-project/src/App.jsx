import { useEffect,useState } from "react";

function App(){
  const[status,setStatus]=useState("loading...");
  const[error,setError]=useState(null);

  useEffect(()=>{
    fetch("http://127.0.0.1:8000/health")
    .then((res)=>{
      if(!res.ok){
        throw new Error("Server Error"+res.status);
      }
      return res.json();
    })
    .then((data)=>setStatus(data.status))
    .catch((err)=>setError(err.message));
  },[])


return(
  <div style={{padding:24}}>
    <h1>Complaints</h1>
    {error?(
      <p style={{color:"red"}}>Backend error:{error}</p>
    ):(
      <p>Backend status:{status}</p>
    )}
  </div>
)
}

export default App;