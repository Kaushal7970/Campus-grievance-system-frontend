import React, { useState } from "react";

function Register({ setPage }) {

  const [form, setForm] = useState({
    name:"", email:"", password:""
  });

  const handleChange = (e) => {
    setForm({...form, [e.target.name]:e.target.value});
  };

  const register = () => {
    fetch("http://localhost:8080/auth/register", {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify(form)
    })
    .then(()=> {
      alert("Registered!");
      setPage("login");
    });
  };

  return (
    <div className="container text-center mt-5">
      <h2>Register</h2>

      <input name="name" className="form-control m-2"
        placeholder="Name" onChange={handleChange}/>

      <input name="email" className="form-control m-2"
        placeholder="Email" onChange={handleChange}/>

      <input name="password" type="password"
        className="form-control m-2"
        placeholder="Password" onChange={handleChange}/>

      <button className="btn btn-success" onClick={register}>
        Register
      </button>
    </div>
  );
}

export default Register;