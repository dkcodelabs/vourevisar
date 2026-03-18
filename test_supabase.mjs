
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://ebghgbzvdiytxuxmnvvt.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImViZ2hnYnp2ZGl5dHh1eG1udnZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc3NTg3NzcsImV4cCI6MjA2MzMzNDc3N30.vhTig84oUI__MlicbM_eXVuyHe_OMZRpKppD9tAcbjQ";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testConnection() {
    console.log("Testing connection to Supabase...");
    try {
        const start = Date.now();
        const { data, error } = await supabase.auth.signInWithPassword({
            email: 'test@example.com',
            password: 'any_password'
        });
        const duration = Date.now() - start;
        
        console.log(`Request finished in ${duration}ms`);
        if (error) {
            console.log("Expected error (Invalid credentials):", error.message);
            if (error.message.includes("Invalid login credentials")) {
                console.log("SUCCESS: Connection reached Supabase and returned a valid error response.");
            } else {
                console.log("UNEXPECTED ERROR:", error);
            }
        } else {
            console.log("UNEXPECTED SUCCESS (Logged in with test credentials):", data);
        }
    } catch (err) {
        console.error("FATAL ERROR (Likely Timeout/Network):", err);
    }
}

testConnection();
