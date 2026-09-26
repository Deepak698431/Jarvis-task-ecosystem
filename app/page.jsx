import ClientDashboard from './ClientDashboard';
import { headers } from 'next/headers';

export const dynamic = 'force-dynamic'; 

export default async function Home() {
  try {
    const headersList = await headers();
    const host = headersList.get('host');
    const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';
    
    // Server fetch (passes [] if unauthorized, letting ClientDashboard authenticate on client)
    const res = await fetch(`${protocol}://${host}/api/Tasks`, {
      cache: 'no-store'
    });
    
    if (!res.ok) {
      // 401 or no auth headers on server — hand off to client auth
      return <ClientDashboard initialTasks={[]} />;
    }

    const json = await res.json();
    const initialTasks = json.data || [];

    return <ClientDashboard initialTasks={initialTasks} />;
    
  } catch (error) {
    console.error("Failed to load tasks from database:", error);
    return <ClientDashboard initialTasks={[]} />;
  }
}