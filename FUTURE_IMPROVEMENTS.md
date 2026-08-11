# FUTURE IMPROVEMENTS

This section discusses how the interview solution can evolve into a production-ready system and answers the follow-up system design questions.

---

# 1. What would you do next to bring this app to production?

## Production Architecture

```text
                Client
                   │
                   ▼
        Application Load Balancer
                   │
        ┌──────────┴──────────┐
        ▼                     ▼
   API Instance 1        API Instance 2
        │                     │
        └──────────┬──────────┘
                   ▼
                Redis Cache
                   │
            (Cache Miss Only)
                   ▼
             PostgreSQL Database
```

### Improvements

- Replace the in-memory datastore with PostgreSQL.
- Cache frequently accessed URLs using Redis.
- Containerize the application using Docker.
- Deploy multiple stateless application instances.
- Add monitoring, logging, and health checks.
- Validate input URLs and implement security controls.
- Configure CI/CD for automated testing and deployment.

---

# 2. How might you handle higher traffic (e.g. Taylor Swift concert)?

The redirect endpoint is read-heavy, so the architecture should optimize for reads.

## Horizontal Scaling

```text
             Load Balancer
          ┌──────┼──────┐
          ▼      ▼      ▼
       API 1   API 2   API 3
```

## Redis Cache

```text
Client
   │
   ▼
Redis
   │ (cache miss)
   ▼
PostgreSQL
```

Additional scaling strategies:

- Cache hot URLs in Redis.
- Use read replicas for the database.
- Offload analytics and logging to asynchronous workers using a message queue.

---

# 3. Assuming you are deploying to AWS, what would be the best approach?

```text
              Route 53
                  │
               AWS WAF
                  │
     Application Load Balancer
                  │
      ECS / EKS Auto Scaling
          │               │
          ▼               ▼
   ElastiCache        Amazon RDS
      (Redis)       (PostgreSQL)
```

Recommended AWS services:

- Amazon ECS or EKS
- Application Load Balancer
- Amazon RDS (PostgreSQL)
- Amazon ElastiCache (Redis)
- AWS WAF
- Amazon CloudWatch
- AWS X-Ray
- Amazon SQS
- AWS Secrets Manager

---

# 4. Assuming you are deploying on-premise (1 GB RAM, 1 vCPU), what alternative architecture would you take to handle "Taylor Swift" scale traffic?

With limited hardware, scaling horizontally may not be possible. Instead, optimize for read-heavy workloads by moving redirect handling out of the application.

## Nginx Redirect Architecture

```text
                Client
                   │
                   ▼
                Nginx
                   │
             HTTP 302 Redirect
```

Generate a redirect mapping file from the database:

```text
abc123 → https://example.com
xyz789 → https://google.com
```

The application only handles URL creation and periodically regenerates the mapping file.

Benefits:

- Very low CPU overhead
- High redirect throughput
- Minimal application load

---

# Future Improvements

## Feature Enhancements

- URL expiration (time-based or click-based expiration)
- URL updating (change destination while keeping the same short URL)
- URL deletion and soft delete
- Custom aliases/slugs
- Password-protected URLs
- One-time use URLs
- Scheduled activation/deactivation
- Bulk URL creation (CSV upload or API)

## User Management

- User authentication and authorization
- User dashboard for managing URLs
- Team/workspace support with role-based access control (RBAC)
- API keys for programmatic URL creation

## Analytics

- Analytics dashboard
- Click tracking (location, browser, device, referrer)
- Real-time analytics
- Export analytics (CSV/JSON)

## Performance & Scalability

- Redis caching for frequently accessed URLs
- Asynchronous analytics using a message queue (Kafka, RabbitMQ, or SQS)
- CDN for static assets (QR codes, frontend)
- Database read replicas
- Database sharding for very large datasets
- Multi-region deployment with geo-routing

## Security

- Rate limiting
- Abuse prevention / Link moderation
- Safe Browsing or VirusTotal integration
- CAPTCHA for anonymous users
- Domain blacklist/allowlist
- Input validation and URL sanitization
- Audit logging

## Nice-to-Have Features

- QR code generation
- Branded/custom domains
- Device-based redirects
- A/B testing for destination URLs
- Link preview page
- AI-powered malicious URL detection
- AI-generated memorable custom aliases
