package com.timeblocks.debug;

import jakarta.servlet.*;
import jakarta.servlet.http.*;
import org.slf4j.MDC;
import org.springframework.stereotype.Component;
import java.io.IOException;
import java.util.UUID;

@Component
public class CorrelationFilter implements Filter {
  public static final String HDR = "X-Correlation-Id";
  public static final String MDC_KEY = "cid";

  @Override
  public void doFilter(ServletRequest req, ServletResponse res, FilterChain chain)
      throws IOException, ServletException {
    HttpServletRequest r = (HttpServletRequest) req;
    HttpServletResponse w = (HttpServletResponse) res;

    String cid = r.getHeader(HDR);
    if (cid == null || cid.isBlank()) cid = "be-" + UUID.randomUUID().toString().substring(0,8);

    MDC.put(MDC_KEY, cid);
    try {
      long t0 = System.currentTimeMillis();
      chain.doFilter(req, res);
      long dt = System.currentTimeMillis() - t0;
      w.setHeader(HDR, cid);
      // Reduce noise for high-frequency endpoints
      String path = r.getRequestURI();
      var logger = org.slf4j.LoggerFactory.getLogger(getClass());
      if (path.startsWith("/api/subtasks")) {
        if (logger.isDebugEnabled()) {
          logger.debug("cid={} {} {} -> {} ({} ms)", cid, r.getMethod(), path, w.getStatus(), dt);
        }
      } else {
        logger.info("cid={} {} {} -> {} ({} ms)", cid, r.getMethod(), path, w.getStatus(), dt);
      }
    } finally {
      MDC.remove(MDC_KEY);
    }
  }
}


