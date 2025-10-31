// src/pages/IndexTestPage.jsx

import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";

function IndexTestPage() {
  const [message, setMessage] = useState("Running a complex query...");

  useEffect(() => {
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

        setMessage(
          "✅ Complex query successful. The index likely already exists in your Firestore project."
        );
      } catch (error) {
        console.error("👇 Firestore error:", error);
        setMessage(
          "❌ Query failed. Check the browser console (F12) for an error message from Firestore. It will contain the link you need to create the index."
        );
      }
    };

    fetchData();
  }, []);

  return (
    <div style={{ padding: "40px", textAlign: "center", fontSize: "18px" }}>
      <h1>Testing for Index Creation</h1>
      <p>{message}</p>
    </div>
  );
}

export default IndexTestPage;
