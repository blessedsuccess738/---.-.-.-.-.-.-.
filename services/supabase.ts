
import { createClient } from '@supabase/supabase-js';

/**
 * Supabase configuration initialized with project URL and public anon key.
 * This client is used for all authentication and database interactions.
 */

const supabaseUrl = 'https://qvdhsdokeouqttzyvcxb.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2ZGhzZG9rZW91cXR0enl2Y3hiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3MzUwMDMsImV4cCI6MjA4MzMxMTAwM30.5V_b2DFtCPdxTczOrdend97UYEbq9ohfGRvN-_F9RPc';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
