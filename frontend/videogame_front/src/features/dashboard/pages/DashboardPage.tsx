import React from "react";
import { Navigate } from "react-router-dom";
import { Container } from "../../../common/ui/Container";
import { Heading } from "../../../common/ui/Heading";
import { Text } from "../../../common/ui/Text";

const DashboardPage: React.FC = () => {
  const token = localStorage.getItem("access_token");

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  const handleLogout = () => {
    localStorage.clear();
    window.location.reload();
  };

  return (
    <Container variant="page" className="flex-col">
      <Heading level={1}>Welcome to the Dashboard</Heading>
      <Text variant="secondary" className="mt-4">
        You are successfully authenticated!
      </Text>
      <button
        onClick={handleLogout}
        className="mt-8 px-6 py-2 border border-red-500/50 text-red-400 rounded hover:bg-red-500/10 transition-colors"
      >
        Logout
      </button>
    </Container>
  );
};

export default DashboardPage;
