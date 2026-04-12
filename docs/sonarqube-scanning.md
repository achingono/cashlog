# SonarQube Scanning

This repository includes a SonarQube scanning pipeline with two containers:

- `sonarqube` (server)
- `sonarqube-scan` (scanner)

Both are defined in `docker-compose.yml` under the `sonar` profile.

## Local comprehensive scan

1. Start SonarQube:

   ```bash
   docker compose --profile sonar up -d sonarqube
   ```

2. Run a full codebase scan and collect open issues:

   ```bash
   chmod +x scripts/sonar/*.sh
   ./scripts/sonar/run-scan.sh
   ```

3. Group findings into PRD clusters:

   ```bash
   ./scripts/sonar/generate-prds.sh .sonar/issues.json docs
   ```

PRDs are generated in `docs/sonar-prds/`.

To generate rule-level issue summaries:

```bash
./scripts/sonar/summarize-issues.sh .sonar/issues.json .sonar
```

Summary outputs are written to `.sonar/`:
- `issues.tsv`
- `issues-top-sample.tsv`
- `rule-counts.tsv`
- `rule-counts-top20.tsv`
- `top-rule-violations.txt`

## CI schedule

The GitHub Actions workflow `.github/workflows/scheduled-scan.yml` runs weekly and on manual dispatch. It:

1. Starts SonarQube.
2. Runs a full scan.
3. Generates rule-level issue summaries.
4. Generates PRDs for issue clusters.
5. Opens/updates a PR containing `docs/sonar-prds`.
