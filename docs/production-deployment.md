# Productieconfiguratie

## Besloten basisarchitectuur

- **Hosting:** Linode Shared CPU, 2 GB RAM, regio Amsterdam.
- **Besturingssysteem:** Debian 13.
- **Canonical URL:** `https://baby.example.invalid`.
- **Deployment:** Docker Compose met Next.js, PostgreSQL en Caddy.
- **DNS:** Cloudflare DNS-only tijdens de eerste installatie.
- **E-mail:** Resend, verzender `baby@example.invalid`.
- **Database:** PostgreSQL op dezelfde Linode als de app.
- **Backups:** versleutelde PostgreSQL-dumps naar private S3-compatible Object
alleen read-only toegang tot de repository waaraan hij is toegevoegd.
## Server aanmaken en eerste internettest

1. Maak een Linode Shared CPU met 2 GB RAM in Amsterdam en installeer Debian
   13.
2. Noteer het publieke IPv4-adres. Controleer in de Linode Cloud Firewall dat
   SSH (TCP 22) tijdelijk bereikbaar is vanaf jouw thuis-IP of, als dat nog
   niet bekend is, vanaf internet tijdens deze eerste test.
3. Test SSH vanaf Windows PowerShell:

```powershell
ssh root@<linode-ip>
```

4. Voer op de Debian-server een tijdelijke HTTP-test uit. Deze test raakt de
   applicatie en database niet.

```bash
mkdir -p /tmp/babyly-connectivity-test
printf '<h1>Babyly server is bereikbaar</h1>\n' \
  > /tmp/babyly-connectivity-test/index.html
if command -v ufw >/dev/null 2>&1; then
   ufw allow 8080/tcp comment 'Temporary connectivity test'
fi
cd /tmp/babyly-connectivity-test
nohup python3 -m http.server 8080 --bind 0.0.0.0 \
  --directory /tmp/babyly-connectivity-test \
  >/tmp/babyly-connectivity-test.log 2>&1 &
echo $! > /tmp/babyly-connectivity-test.pid
```

Als UFW op de nieuwe machine nog niet is geïnstalleerd, sla de `ufw allow`
regel over en laat alleen tijdelijk TCP 8080 toe in de Linode Cloud Firewall.
De provisioningstap installeert UFW later en sluit deze tijdelijke poort weer.

5. Open thuis `http://<linode-ip>:8080`. Verwacht:
   `Babyly server is bereikbaar`. Als dit niet werkt, controleer ook de
   Linode Cloud Firewall naast UFW.
6. Stop de test direct na bevestiging. Ga eerst naar een bestaande directory;
   anders blijft je shell in de verwijderde `/tmp`-directory staan.

```bash
kill "$(cat /tmp/babyly-connectivity-test.pid)"
cd /root
ufw delete allow 8080/tcp 2>/dev/null || true
rm -rf /tmp/babyly-connectivity-test /tmp/babyly-connectivity-test.log \
  /tmp/babyly-connectivity-test.pid
```

Verwijder na afloop ook de tijdelijke TCP 8080-regel uit de Linode Cloud
Firewall. De standaard productie-firewall gebruikt alleen SSH, HTTP en HTTPS.

## Private GitHub-repository

De repository is privé. Geef de server daarom repository-specifieke, read-only
toegang met een deploy key. Gebruik geen persoonlijk GitHub-wachtwoord of
persoonlijke access token.

Maak als `root` op de Debian-server een key:

```bash
install -d -m 700 /root/.ssh
ssh-keygen -t ed25519 \
  -f /root/.ssh/babyly_deploy \
  -C "babyly-production-deploy"
```

Configureer SSH:

```bash
cat > /root/.ssh/config <<'EOF'
Host github.com
  HostName github.com
  User git
  IdentityFile /root/.ssh/babyly_deploy
  IdentitiesOnly yes
EOF
chmod 600 /root/.ssh/config
```

Voeg GitHub als bekende host toe nadat je de fingerprint tegen de officiële
GitHub-documentatie hebt gecontroleerd:

```bash
ssh-keyscan -t ed25519 github.com >> /root/.ssh/known_hosts
chmod 644 /root/.ssh/known_hosts
```

Toon de publieke key en voeg hem toe via `Repository -> Settings -> Deploy
keys -> Add deploy key`. Gebruik titel `Babyly production server` en laat
**Allow write access** uitgeschakeld.

```bash
cat /root/.ssh/babyly_deploy.pub
ssh -T git@github.com
git ls-remote git@github.com:pSecurIT/babyly.git
```

GitHub biedt geen shelltoegang aan; een melding dat authenticatie geslaagd is,
is normaal. De private key mag nooit in de repository, `.env.production`, een
issue of chat worden geplaatst.

## Server voorbereiden

Het provisioning-script staat lokaal in
[`scripts/provision-debian13.sh`](../scripts/provision-debian13.sh), maar de
repository staat nog niet op een nieuwe server. Kopieer daarom eerst alleen
het script vanaf Windows naar de server.

Op Windows PowerShell, vanuit de repository-root:

```powershell
scp .\scripts\provision-debian13.sh root@<linode-ip>:/root/
```

Op de Debian-server:

```bash
chmod 700 /root/provision-debian13.sh
bash /root/provision-debian13.sh
```

Het script installeert Docker Engine en Compose, Git, AWS CLI, OpenSSL, UFW en
unattended-upgrades. Het maakt de `babyly`-serviceuser aan, clone’t de
repository naar `/opt/babyly` en registreert `babyly.service`. De `babyly`-user
is een serviceuser en geen SSH-beheeraccount. Het verwijdert
zo nodig het oude Debian-pakket `docker-compose` voordat de officiële Compose-
plugin wordt geïnstalleerd.

Het script start de applicatie niet en genereert geen secrets. Gebruik
`--configure-ssh` pas nadat SSH-sleutellogin in een tweede terminal is
geverifieerd; de optie schakelt root- en wachtwoordlogin uit.

Het script kan opnieuw worden uitgevoerd. Bij een bestaande clone gebruikt het
een padgebonden Git-configuratie voor `/opt/babyly`, zodat Git de bekende
ownership-check niet onterecht blokkeert. Voeg hiervoor geen globale
`safe.directory=*`-uitzondering toe.

### Service user en SSH-toegang

Het script maakt de systeemuser `babyly` aan met:

- home directory `/opt/babyly`;
- primaire groep `babyly`;
- lidmaatschap van de groep `docker`, nodig om de Compose-stack te beheren;
- shell `/usr/sbin/nologin`.

Deze user draait de productie-Compose-service en is bewust geen SSH-loginuser.
Docker-groeplidmaatschap geeft uitgebreide hostrechten. Gebruik `babyly` daarom
niet voor dagelijks interactief beheer.

Het provisioning-script maakt automatisch een aparte SSH-beheeruser `deploy`
aan. Deze user krijgt een normale shell, wordt lid van `sudo` en krijgt een
lid van `docker` voor handmatig Compose-beheer en krijgt een kopie van
`/root/.ssh/authorized_keys`. De `babyly`-serviceuser blijft daarvan
gescheiden en heeft geen interactieve shell.

Na het uitvoeren van het provisioning-script test je vanuit een tweede
PowerShell- of terminalvenster:

```powershell
ssh deploy@<linode-ip>
```

Controleer in die tweede sessie:

```bash
whoami
sudo -v
```

Verwacht `deploy` als uitvoer van `whoami` en een succesvolle sudo-
authenticatie. Voer pas daarna in de eerste sessie uit:

```bash
bash /root/provision-debian13.sh --configure-ssh
```

Test de tweede SSH-sessie daarna opnieuw. Sluit de oorspronkelijke root-sessie
pas wanneer `ssh deploy@<linode-ip>` opnieuw werkt.

Na de provisioning:

1. De firewall staat alleen SSH, HTTP en HTTPS toe.
2. De repository staat op `/opt/babyly` en de Composefile in `/opt/babyly/web`.
3. Kopieer in `/opt/babyly/web` `.env.production.example` naar
   `.env.production` en vul alle
   `CHANGE_THIS`-waarden in. Dit bestand mag nooit worden gecommit.
4. Maak `/etc/babyly/backup-encryption-password` aan met strikte
   rechten (`chmod 600`). Zet het wachtwoord niet in de repository.

## DNS en HTTPS

Maak bij Cloudflare een DNS-only `A`-record:

```text
Type: A
Name: baby
Value: <publiek IPv4-adres van de Linode>
Proxy status: DNS only
```

Start daarna vanuit `web/`:

```bash
docker compose up -d --build
```

De Composefile staat in `/opt/babyly/web`. De systemd-service start de stack
als serviceuser `babyly`; voor handmatig beheer kan `deploy` in die directory
`docker compose up -d --build` uitvoeren nadat de Docker-groep actief is.
Gebruik bij voorkeur `sudo systemctl start babyly.service` voor de beheerde
productiestart.

Als Compose meldt dat `/opt/babyly/web/.env` geen toegang heeft, bestaat daar
waarschijnlijk een oud, root-only `.env`-bestand. De productieconfiguratie
gebruikt `.env.production`; `.env` is daarom niet nodig. Controleer eerst:

```bash
ls -la /opt/babyly/web/.env*
```

Verplaats een overbodig oud bestand veilig uit de Compose-directory:

```bash
sudo mv /opt/babyly/web/.env /opt/babyly/web/.env.unused
sudo chmod 600 /opt/babyly/web/.env.unused
```

Gebruik daarna in `/opt/babyly/web` opnieuw `docker compose up -d --build`.
De `deploy`-user moet na het toevoegen aan de Docker-groep opnieuw inloggen
of een nieuwe login-shell openen voordat de groepsrechten actief zijn.

De standaardfile `docker-compose.yml` gebruikt `.env.production` voor de
applicatie en database. Er is bewust maar één Composefile voor productie, zodat
`docker compose up` en onderhoudscommando's dezelfde configuratie gebruiken.

Caddy vraagt automatisch een publiek certificaat aan zodra DNS naar de Linode
wijst. Controleer daarna HTTPS, de security headers en de volledige E2E-suite.

### Latere Cloudflare-proxyfase

Pas nadat directe HTTPS stabiel werkt:

1. Zet het `baby`-record op **Proxied**.
2. Zet Cloudflare SSL/TLS encryption op **Full (strict)**.
3. Gebruik geen Flexible SSL.
4. Controleer dat Cloudflare alleen HTTPS aanbiedt en de origin niet onnodig
   buiten Cloudflare bereikbaar blijft.
5. Herhaal security-header-, auth-, CSRF- en E2E-tests.

## Backups

`deploy/backup.sh` maakt een gzip PostgreSQL-dump, versleutelt die lokaal met
OpenSSL en uploadt het resultaat naar private Object Storage. Configureer een
cronjob op de Linode, bijvoorbeeld dagelijks buiten gebruikstijd. Stel daarnaast
Object Storage lifecycle cleanup in zodra de gewenste backupbewaartermijn is
vastgelegd.

Een restore-test is verplicht vóór livegang:

1. Download één backup naar een tijdelijke, niet-publieke map.
2. Ontsleutel en herstel hem naar een afzonderlijke PostgreSQL-database.
3. Controleer relaties, voorspellingen en adressen.
4. Verwijder de tijdelijke database en het lokale backupbestand.
5. Leg datum, resultaat en uitvoerder vast zonder persoonsgegevens te loggen.

## E-mail en secrets

Resend vereist domeinverificatie en SPF, DKIM en DMARC voor
`example.invalid`. Gebruik de API-key alleen op de server. De twee admin-
e-mails en het privacycontactadres worden uitsluitend server-side ingesteld.

De applicatie gebruikt in provider-modus de Resend API. De console-mailmodus
blijft alleen bedoeld voor lokale ontwikkeling. Controleer na deployment met
een echte testaanvraag dat de magic link aankomt en éénmalig werkt.
