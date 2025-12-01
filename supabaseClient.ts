
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uozirhzlyhrysaliryez.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVvemlyaHpseWhyeXNhbGlyeWV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1ODMyMjQsImV4cCI6MjA4MDE1OTIyNH0.-hlawbh0vwkac5Qy2MW1vO4oPgybl6VqZy_0S0WHg2g';

export const supabase = createClient(supabaseUrl, supabaseKey);
