import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if(!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Missing Supabase configuration in environment variables");
}

//create supabse client
export const supabase = createClient(supabaseUrl, supabaseServiceKey);
//test connection function
export async function testConnection(){
    try{
        const {data, error} = await supabase
        .from('users').select('count').limit(1);

        if(error) throw error;

        console.log("Supabase connection successful:", data);
        return true;
    }catch(error){
        console.error("Supabase connection failed:", error);
        return false;
    }
}

