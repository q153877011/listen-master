import { NextResponse } from "next/server";
import { auth } from "./app/auth";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  
  // 检查是否访问 admin 路由
  if (pathname.startsWith("/admin")) {
    console.log("访问 admin 路由:", pathname);
    console.log("req.auth:", req.auth);
    console.log("req.auth?.user:", req.auth?.user);
    console.log("req.auth?.user?.role:", req.auth?.user?.role);
    
    const userRole = req.auth?.user?.role;
    const isAuthenticated = !!req.auth?.user;

    console.log("用户是否已认证:", isAuthenticated);
    console.log("用户角色:", userRole);

    // 如果用户未登录，重定向到登录页面
    if (!isAuthenticated) {
      console.log("用户未登录，重定向到登录页面");
      const url = req.nextUrl.clone();
      url.pathname = "/users/login";
      return NextResponse.redirect(url);
    }

    // 如果用户已登录但角色不是 admin，则重定向到首页
    if (userRole !== "admin") {
      console.log("用户角色不是 admin，重定向到首页");
      const url = req.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }

    console.log("用户角色是 admin，允许访问");
  }

  // 其他情况，允许访问
  return NextResponse.next();
});

// See "Matching Paths" below to learn more
export const config = {
  matcher: ["/admin/:path*"],
};