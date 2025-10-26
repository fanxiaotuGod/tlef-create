# GitOps Workflow with ArgoCD

Understanding how GitOps works in the TLEF-CREATE project.

## 🎯 What is GitOps?

GitOps uses **Git as the single source of truth** for declarative infrastructure and applications.

### Traditional Deployment
```
Developer → Jenkins → kubectl apply → Cluster
           (manual, error-prone)
```

### GitOps Deployment
```
Developer → Git Push → ArgoCD detects → Cluster auto-syncs
          (declarative, auditable, repeatable)
```

## 🔄 Complete GitOps Flow

```
┌─────────────────────────────────────────────────────────┐
│ 1. Developer Workflow                                   │
└─────────────────────────────────────────────────────────┘
   Developer codes feature
         ↓
   Commits to feature branch
         ↓
   Creates PR to main
         ↓
   PR approved and merged
         ↓

┌─────────────────────────────────────────────────────────┐
│ 2. GitHub Actions (CI/CD)                               │
└─────────────────────────────────────────────────────────┘
   Auto-merge main → staging
         ↓
   Build Docker images
         ↓
   Push to AWS ECR
         ↓
   Update values.yaml with new image tags
         ↓
   Commit updated values.yaml to Git
         ↓

┌─────────────────────────────────────────────────────────┐
│ 3. ArgoCD (GitOps Engine)                               │
└─────────────────────────────────────────────────────────┘
   ArgoCD polls Git every 3 minutes
         ↓
   Detects change in values.yaml
         ↓
   Compares desired state (Git) vs actual state (cluster)
         ↓
   Syncs cluster to match Git
         ↓
   Kubernetes performs rolling update
         ↓

┌─────────────────────────────────────────────────────────┐
│ 4. Result                                                │
└─────────────────────────────────────────────────────────┘
   ✅ New version deployed!
   ✅ Zero downtime
   ✅ Fully auditable (Git history)
   ✅ Easy rollback (git revert)
```

## 📁 GitOps Repository Structure

```
tlef-create (staging branch)
├── devops/k8s/helm/tlef-create/
│   ├── Chart.yaml                    # Helm chart metadata
│   ├── values.yaml                   # ← ArgoCD watches this!
│   └── templates/
│       ├── frontend-deployment.yaml
│       ├── backend-deployment.yaml
│       ├── mongodb-statefulset.yaml
│       └── ...
```

**Key Point:** ArgoCD watches `devops/k8s/helm/tlef-create/` for changes.

## 🎮 ArgoCD Application Configuration

Location: `devops/k8s/argocd/application.yaml`

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: tlef-create-staging
  namespace: argocd
spec:
  source:
    repoURL: https://github.com/fanxiaotuGod/tlef-create.git
    targetRevision: staging  # Branch to watch
    path: devops/k8s/helm/tlef-create  # Path to Helm chart

  destination:
    server: https://kubernetes.default.svc
    namespace: tlef-staging

  syncPolicy:
    automated:
      prune: true      # Delete resources removed from Git
      selfHeal: true   # Auto-fix manual changes
```

## 🔍 How ArgoCD Syncs

### 1. Desired State (Git)

```yaml
# values.yaml
frontend:
  image:
    repository: 123.dkr.ecr.us-west-2.amazonaws.com/tlef-frontend
    tag: staging-abc123  # ← New version
```

### 2. Actual State (Cluster)

```bash
kubectl get deployment tlef-create-frontend -o yaml
# Shows: image: .../tlef-frontend:staging-xyz789  # ← Old version
```

### 3. ArgoCD Action

ArgoCD detects mismatch and executes:
```bash
helm upgrade tlef-create devops/k8s/helm/tlef-create \
  --namespace tlef-staging
```

Result: Rolling update to new version!

## 📊 Monitoring ArgoCD

### Access ArgoCD UI

```bash
# Get URL and credentials
ssh -i ~/.ssh/tlef-create-staging.pem ubuntu@<EC2_IP>
cat ~/argocd-credentials.txt
```

Open browser to ArgoCD URL and login.

### ArgoCD CLI (Optional)

```bash
# Install ArgoCD CLI
brew install argocd  # macOS

# Login
argocd login <ARGOCD_SERVER> --username admin --password <PASSWORD>

# View applications
argocd app list

# Get application details
argocd app get tlef-create-staging

# Force sync
argocd app sync tlef-create-staging

# View history
argocd app history tlef-create-staging
```

## 🔄 Common Operations

### Manual Sync

If auto-sync is disabled or you want to sync immediately:

```bash
# Via UI
ArgoCD UI → Click application → Click "SYNC"

# Via CLI
argocd app sync tlef-create-staging

# Via kubectl
kubectl patch application tlef-create-staging -n argocd \
  --type merge -p '{"operation":{"sync":{}}}'
```

### Rollback to Previous Version

**Method 1: Git Revert**
```bash
# Find commit with working version
git log devops/k8s/helm/tlef-create/values.yaml

# Revert to that commit
git revert <commit-hash>
git push origin staging

# ArgoCD will auto-sync to previous version
```

**Method 2: ArgoCD UI**
```
ArgoCD UI → Application → History → Select version → Rollback
```

### Disable Auto-Sync (Maintenance Mode)

```bash
kubectl patch application tlef-create-staging -n argocd \
  --type merge -p '{"spec":{"syncPolicy":{"automated":null}}}'
```

Re-enable:
```bash
kubectl patch application tlef-create-staging -n argocd \
  --type merge -p '{"spec":{"syncPolicy":{"automated":{"prune":true,"selfHeal":true}}}}'
```

## 🎯 GitOps Benefits

### 1. Single Source of Truth
- **Git history** = deployment history
- Every change is tracked
- Easy to see who deployed what and when

### 2. Auditable
```bash
# See all deployments
git log devops/k8s/helm/tlef-create/values.yaml

# See specific change
git show <commit-hash>
```

### 3. Easy Rollback
```bash
# Rollback is just a git revert
git revert HEAD
git push origin staging
# ArgoCD auto-syncs to previous version!
```

### 4. Disaster Recovery
```bash
# Cluster destroyed? Recreate and point ArgoCD to Git
# ArgoCD will rebuild everything automatically!
```

### 5. Preview Changes
```bash
# Before merge, see what will be deployed
git diff main..feature-branch devops/k8s/helm/tlef-create/
```

## 🔐 Security Considerations

### Private Repository

If your repo is private:

```yaml
# In ArgoCD Application
spec:
  source:
    repoURL: https://github.com/fanxiaotuGod/tlef-create.git
    targetRevision: staging
    # Add credentials
    sshPrivateKeySecret:
      name: repo-credentials
      key: sshPrivateKey
```

Create secret:
```bash
kubectl create secret generic repo-credentials \
  --from-file=sshPrivateKey=~/.ssh/id_rsa \
  -n argocd
```

### Secrets in Git

**⚠️ NEVER commit secrets directly!**

Use one of:
1. **Sealed Secrets** (recommended)
2. **External Secrets Operator**
3. **AWS Secrets Manager** (via External Secrets)

## 📈 Monitoring Sync Status

### Check Sync Status

```bash
# Get application status
kubectl get application tlef-create-staging -n argocd

# Detailed status
kubectl describe application tlef-create-staging -n argocd
```

### View Sync Events

```bash
# Recent events
kubectl get events -n argocd --sort-by='.lastTimestamp'

# Application-specific events
argocd app get tlef-create-staging --show-operation
```

## 🐛 Troubleshooting

### Application Stuck in "Progressing"

```bash
# Check application details
argocd app get tlef-create-staging

# View logs
kubectl logs -n argocd deployment/argocd-application-controller -f

# Force refresh
argocd app refresh tlef-create-staging
```

### Sync Failed

```bash
# View error details
argocd app get tlef-create-staging

# Common issues:
# 1. Invalid Helm chart
# 2. Resource conflicts
# 3. Insufficient permissions

# Fix and retry
argocd app sync tlef-create-staging --force
```

### Out of Sync but Healthy

Check for:
- Manual changes in cluster (will be overwritten by selfHeal)
- Ignore differences in application.yaml
- Status fields that ArgoCD tracks

## 🎓 Best Practices

1. **Always commit to Git, never kubectl apply directly**
   ```bash
   # ❌ Don't do this
   kubectl apply -f deployment.yaml

   # ✅ Do this
   # Edit values.yaml → commit → push → let ArgoCD sync
   ```

2. **Use meaningful commit messages**
   ```bash
   git commit -m "Update frontend to v2.1.0 with bug fixes"
   ```

3. **Test in feature branch first**
   ```
   feature-branch → test → main → auto-merge → staging → ArgoCD deploys
   ```

4. **Monitor ArgoCD notifications**
   - Set up Slack/email notifications for sync status

5. **Regular health checks**
   ```bash
   argocd app list
   # All apps should show "Synced" and "Healthy"
   ```

## 📚 Additional Resources

- [ArgoCD Documentation](https://argo-cd.readthedocs.io/)
- [GitOps Principles](https://opengitops.dev/)
- [Helm Charts](https://helm.sh/docs/topics/charts/)

---

**GitOps makes deployments:**
- ✅ Reliable
- ✅ Auditable
- ✅ Repeatable
- ✅ Fast
- ✅ Safe

**Git is your deployment button!** 🚀
