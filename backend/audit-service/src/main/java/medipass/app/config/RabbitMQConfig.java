package medipass.app.config;

import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    @Value("${rabbitmq.exchange:medipass.events}")
    private String exchangeName;

    @Value("${rabbitmq.dead-letter-exchange:medipass.events.dlx}")
    private String dlxName;

    @Value("${rabbitmq.dead-letter-queue:audit.dead-letter}")
    private String dlqName;

    @Value("${rabbitmq.queue:notification.events}")
    private String notificationQueueName;

    @Value("${rabbitmq.queues.patient-events:audit.patient.events}")
    private String patientQueueName;

    @Value("${rabbitmq.queues.visit-events:audit.visit.events}")
    private String visitQueueName;

    @Value("${rabbitmq.queues.prescription-events:audit.prescription.events}")
    private String prescriptionQueueName;

    @Value("${rabbitmq.queues.test-events:audit.test.events}")
    private String testQueueName;

    @Value("${rabbitmq.queues.auth-events:audit.auth.events}")
    private String authQueueName;

    @Value("${rabbitmq.queues.security-events:audit.security.events}")
    private String securityQueueName;

    @Value("${rabbitmq.queues.system-events:audit.system.events}")
    private String systemQueueName;

    @Bean
    public TopicExchange eventExchange() {
        return ExchangeBuilder.topicExchange(exchangeName).durable(true).build();
    }

    @Bean
    public FanoutExchange deadLetterExchange() {
        return ExchangeBuilder.fanoutExchange(dlxName).durable(true).build();
    }

    @Bean
    public Queue deadLetterQueue() {
        return QueueBuilder.durable(dlqName).build();
    }

    @Bean
    public Binding deadLetterBinding(Queue deadLetterQueue, FanoutExchange deadLetterExchange) {
        return BindingBuilder.bind(deadLetterQueue).to(deadLetterExchange);
    }

    private Queue createAuditQueue(String queueName) {
        return QueueBuilder.durable(queueName)
                .withArgument("x-dead-letter-exchange", dlxName)
                .build();
    }

    @Bean
    public Queue patientQueue() { return createAuditQueue(patientQueueName); }

    @Bean
    public Queue visitQueue() { return createAuditQueue(visitQueueName); }

    @Bean
    public Queue prescriptionQueue() { return createAuditQueue(prescriptionQueueName); }

    @Bean
    public Queue testQueue() { return createAuditQueue(testQueueName); }

    @Bean
    public Queue authQueue() { return createAuditQueue(authQueueName); }

    @Bean
    public Queue securityQueue() { return createAuditQueue(securityQueueName); }

    @Bean
    public Queue systemQueue() { return createAuditQueue(systemQueueName); }

    @Bean
    public Queue notificationQueue() {
        return QueueBuilder.durable(notificationQueueName).build();
    }

    @Bean
    public Binding patientBinding(Queue patientQueue, TopicExchange eventExchange) {
        return BindingBuilder.bind(patientQueue).to(eventExchange).with("patient.*");
    }

    @Bean
    public Binding visitBinding(Queue visitQueue, TopicExchange eventExchange) {
        return BindingBuilder.bind(visitQueue).to(eventExchange).with("visit.*");
    }

    @Bean
    public Binding prescriptionBinding(Queue prescriptionQueue, TopicExchange eventExchange) {
        return BindingBuilder.bind(prescriptionQueue).to(eventExchange).with("prescription.*");
    }

    @Bean
    public Binding testBinding(Queue testQueue, TopicExchange eventExchange) {
        return BindingBuilder.bind(testQueue).to(eventExchange).with("test.*");
    }

    @Bean
    public Binding authBinding(Queue authQueue, TopicExchange eventExchange) {
        return BindingBuilder.bind(authQueue).to(eventExchange).with("auth.*");
    }

    @Bean
    public Binding securityBinding(Queue securityQueue, TopicExchange eventExchange) {
        return BindingBuilder.bind(securityQueue).to(eventExchange).with("security.*");
    }

    @Bean
    public Binding systemBinding(Queue systemQueue, TopicExchange eventExchange) {
        return BindingBuilder.bind(systemQueue).to(eventExchange).with("system.*");
    }

    @Bean
    public Binding allergyBinding(Queue notificationQueue, TopicExchange eventExchange) {
        return BindingBuilder.bind(notificationQueue).to(eventExchange).with("allergy.*");
    }

    @Bean
    public Declarables notificationBindings(Queue notificationQueue, TopicExchange eventExchange) {
        return new Declarables(
                BindingBuilder.bind(notificationQueue).to(eventExchange).with("patient.*"),
                BindingBuilder.bind(notificationQueue).to(eventExchange).with("visit.*"),
                BindingBuilder.bind(notificationQueue).to(eventExchange).with("prescription.*"),
                BindingBuilder.bind(notificationQueue).to(eventExchange).with("test.*"),
                BindingBuilder.bind(notificationQueue).to(eventExchange).with("auth.*"),
                BindingBuilder.bind(notificationQueue).to(eventExchange).with("medical.*"),
                BindingBuilder.bind(notificationQueue).to(eventExchange).with("system.*"),
                BindingBuilder.bind(notificationQueue).to(eventExchange).with("security.*")
        );
    }

    @Bean
    public MessageConverter jsonMessageConverter() {
        return new Jackson2JsonMessageConverter();
    }

    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory) {
        RabbitTemplate template = new RabbitTemplate(connectionFactory);
        template.setMessageConverter(jsonMessageConverter());
        return template;
    }
}
