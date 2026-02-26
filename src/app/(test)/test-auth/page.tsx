"use client";

import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TestAuthPage() {
  const { user, userId, loading } = useAuth();

  if (loading) return <div className="p-8">Loading auth state...</div>;

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Authentication Debugger</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-md">
              <h3 className="font-semibold mb-2">Auth Status</h3>
              <div className="space-y-1">
                <p>
                  <span className="text-muted-foreground mr-2">Status:</span>
                  <span className={user ? "text-green-600 font-medium" : "text-yellow-600 font-medium"}>
                    {user ? "Authenticated" : "Not Authenticated"}
                  </span>
                </p>
                <p>
                  <span className="text-muted-foreground mr-2">Loading:</span>
                  {loading ? "Yes" : "No"}
                </p>
              </div>
            </div>

            <div className="p-4 border rounded-md">
               <h3 className="font-semibold mb-2">Effective User ID</h3>
               <p className="font-mono text-sm break-all bg-muted p-2 rounded">
                 {userId || "null"}
               </p>
               <p className="text-xs text-muted-foreground mt-2">
                 This is the ID used for database operations. It may be the Firebase UID or a Test ID.
               </p>
            </div>
          </div>

          {user && (
            <div className="p-4 border rounded-md">
              <h3 className="font-semibold mb-2">Firebase User Details</h3>
              <div className="space-y-2 text-sm">
                <p>
                  <span className="font-medium mr-2">Display Name:</span> 
                  {user.displayName}
                </p>
                <p>
                  <span className="font-medium mr-2">Email:</span> 
                  {user.email}
                </p>
                 <p>
                  <span className="font-medium mr-2">UID:</span> 
                  <span className="font-mono">{user.uid}</span>
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
