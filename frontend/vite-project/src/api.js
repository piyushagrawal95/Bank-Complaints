const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

async function request(path, params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== "" && value !== null && value !== undefined) {
      query.append(key, value);
    }
  });
  const queryString = query.toString();
  const url = `${API_URL}${path}${queryString ? "?" + queryString : ""}`;

  let response;
  try {
    response = await fetch(url);
  } catch {
    throw new Error("Cannot reach the server. Please check that the backend is running.");
  }

  if (!response.ok) {
    let message = `Request failed (status ${response.status})`;
    try {
      const body = await response.json();
      if (typeof body.detail === "string") message = body.detail;
    } catch {
      // the response had no JSON body, keep the default message
    }
    throw new Error(message);
  }
  return response.json();
}

export const getComplaints = (params) => request("/complaints", params);
export const getProducts = () => request("/complaints/meta/products");