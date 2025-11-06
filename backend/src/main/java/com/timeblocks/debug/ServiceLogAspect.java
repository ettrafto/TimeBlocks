package com.timeblocks.debug;

import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import java.util.Arrays;

@Aspect
@Component
public class ServiceLogAspect {
  private static final Logger log = LoggerFactory.getLogger(ServiceLogAspect.class);

  @Around("execution(* com.timeblocks.service.EventService.*(..)) || " +
          "execution(* com.timeblocks.service.OccurrenceService.*(..))")
  public Object traceEventServices(ProceedingJoinPoint pjp) throws Throwable {
    String sig = pjp.getSignature().toShortString();
    Object[] args = pjp.getArgs();
    log.debug("\u25B6 {}", sig);
    log.debug("  args={}", Arrays.toString(args));
    try {
      Object out = pjp.proceed();
      log.debug("  \u2714 {} -> {}", sig, summarize(out));
      return out;
    } catch (Throwable t) {
      log.error("  \u2716 {} threw {}", sig, t.toString(), t);
      throw t;
    }
  }

  private String summarize(Object o) {
    if (o == null) return "null";
    String s = o.toString();
    if (s.length() > 300) s = s.substring(0,300) + " …";
    return s;
  }
}


