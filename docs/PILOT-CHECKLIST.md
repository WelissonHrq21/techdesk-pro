# Pilot Checklist

## Infraestrutura

- [ ] Docker healthy
- [ ] Backup configurado
- [ ] Restore testado
- [ ] HTTPS ativo
- [ ] Dominio configurado
- [ ] CORS restrito aos dominios reais

## Empresa

- [ ] Dados da assistencia configurados em `/settings`
- [ ] Admin inicial criado
- [ ] Pelo menos dois admins ativos
- [ ] Usuarios da recepcao criados
- [ ] Usuarios tecnicos criados
- [ ] Estoque inicial registrado por entradas

## Operacao

- [ ] Cliente cadastrado
- [ ] Equipamento cadastrado
- [ ] OS criada
- [ ] Protocolo impresso
- [ ] Link publico de consulta validado
- [ ] Diagnostico registrado
- [ ] Orcamento criado
- [ ] Orcamento impresso
- [ ] Aprovacao/rejeicao registrada
- [ ] Peca consumida na OS
- [ ] OS finalizada
- [ ] Entrega registrada

## Seguranca

- [ ] `JWT_SECRET` de producao configurado
- [ ] Senhas individuais usadas por cada funcionario
- [ ] Conta admin reserva criada
- [ ] Swagger habilitado/desabilitado conforme decisao do ambiente
- [ ] Backups fora do host principal
- [ ] Link publico testado sem vazamento de dados sensiveis

## Antes do primeiro dia

- [ ] Banco de producao limpo, sem dados ficticios
- [ ] Backup inicial vazio/configurado
- [ ] Teste completo com ADMIN, RECEPTION, TECHNICIAN e link publico
