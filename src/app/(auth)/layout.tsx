import Provider from "@/components/Provider";


export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <Provider>{children}</Provider>
    </>
  );
}