import { Grid, Typography, Container } from 'src/shared/components/compat';
import trabotIcon from 'src/shared/assets/images/logos/trabot-icon.png';

const Footer = () => {
  return (
    <Container maxWidth="lg">
      <Grid container spacing={3} justifyContent="center" mt={4}>
        <Grid item xs={12} sm={5} lg={4} textAlign="center">
          <img src={trabotIcon} alt="ترابوت" width={48} height={48} style={{ borderRadius: 12 }} />
          <Typography fontSize="16" color="textSecondary" mt={1} mb={4}>
            ترابوت، دستیار هوشمند حمل‌ونقل
          </Typography>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Footer;
