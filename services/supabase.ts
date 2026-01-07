
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qvdhsdokeouqttzyvcxb.supabase.co';
const supabaseAnonKey = 'sb_publishable_Mb6qAq6z0tNV2uAtcjtVZQ_sxioKgPi_';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
