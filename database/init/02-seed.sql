-- Seed inicial - Cadastro das 3 empresas do grupo

INSERT INTO empresas (nome) VALUES
    ('Buffet Senhor Churrasco'),
    ('Anjos Cerimonial'),
    ('Em Plena Natureza Chácara de Eventos');

-- Usuários iniciais (seleção de cartão, sem senha — apenas para auditoria de quem confirmou o quê)
INSERT INTO usuarios (nome) VALUES
    ('Pedrinho'),
    ('Pedro'),
    ('Ivonete'),
    ('Matheus'),
    ('Nicolly');
