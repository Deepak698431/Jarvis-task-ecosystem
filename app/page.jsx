import ClientDashboard from './ClientDashboard';
import { headers } from 'next/headers';

// 1. THIS IS THE MAGIC LINE. It completely destroys the Next.js cache.
export const dynamic = 'force-dynamic'; 

export default async function Home() {
  try {
    // 2. Get the current URL (works for both localhost and your Localtunnel)
    const headersList = await headers();
    const host = headersList.get('host');
    const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';
    
    // 3. Fetch from your exact API route, strictly forcing no-store
    const res = await fetch(`${protocol}://${host}/api/Tasks`, {
      cache: 'no-store' 
    });
    
    const json = await res.json();
    
    // 4. Pass ALL tasks (completed and uncompleted) down to the UI
    const initialTasks = json.data || [];

    return <ClientDashboard initialTasks={initialTasks} />;
    
  } catch (error) {
    console.error("Failed to load tasks from database:", error);
    // Fallback so the UI doesn't crash if the DB is offline
    return <ClientDashboard initialTasks={[]} />;
  }
}