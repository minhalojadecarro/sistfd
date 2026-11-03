import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nydipjfgtxxoiwyeudtj.supabase.co';
const supabaseAnonKey = 'sb_publishable_xQy5FHo8gbsJExC9OPOtEg__i7rqFp8';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);