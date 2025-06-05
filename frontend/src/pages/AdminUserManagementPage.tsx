import { Card } from '../components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';

import AdminPostManagementPage from '../components/ui/posts/AdminPostManagementPage';

const AdminUserManagementPage = () => {

  return (
    <Card className="mt-4">
  
    </Card>
  );
};

const AdminDashboardPage = () => {
  return (
    <div className="p-6">
      <h1 className="text-center text-2xl font-bold mb-6">Admin Dashboard</h1>
      <Tabs defaultValue="posts" className="w-full ">
        <TabsList className='align-center justify-center'>
          <TabsTrigger value="posts">Manage Posts</TabsTrigger>
        </TabsList>
        <TabsContent value="posts">
          <AdminPostManagementPage />
        </TabsContent>
        <TabsContent value="users">
          <AdminUserManagementPage />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminDashboardPage;
