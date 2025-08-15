// src/pages/IndexTestPage.jsx

import React, { useEffect, useState } from "react";
import { db } from "../firebase"; // Make sure this path is correct
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";

function IndexTestPage() {
  const [message, setMessage] = useState("Running a complex query...");

  useEffect(() => {
    // This is a composite query: it filters by 'status' and orders by 'createdAt'.
    // This is the kind of query that requires a custom index.
    const complexQuery = query(
      collection(db, "clients"),
      where("status", "==", "Active"),
      orderBy("createdAt", "desc")
    );

    console.log(
      "🚀 Running the complex query now. Check the console for a Firestore error message."
    );

    const fetchData = async () => {
      try {
        await getDocs(complexQuery);
        // If the query succeeds, it means the index already exists.
        setMessage(
          "✅ Complex query successful. The index likely already exists in your Firestore project."
        );
      } catch (error) {
        // If it fails, the error message in the console will contain the link.
        console.error("👇 Firestore error:", error);
        setMessage(
          "❌ Query failed. Check the browser console (F12) for an error message from Firestore. It will contain the link you need to create the index."
        );
      }
    };

    fetchData();
  }, []); // Empty array ensures this runs only once on page load

  return (
    <div style={{ padding: "40px", textAlign: "center", fontSize: "18px" }}>
      <h1>Testing for Index Creation</h1>
      <p>{message}</p>
    </div>
  );
}

export default IndexTestPage;
